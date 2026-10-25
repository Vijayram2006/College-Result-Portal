package edu.kvell.results.marks;

import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Semesters;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Anonymous evaluation for faculty: each answer script is shown under a dummy number instead of the student's
 * register number and name, in a shuffled order (sorted by the dummy number), and the script's first page (the cover
 * with the student's details) is replaced by a blank page. The dummy number is a keyed hash of the department,
 * semester, subject, assessment and register number, so it is stable but cannot be traced back without the server's
 * key. The COE and the Associate Dean keep seeing the real details in register-number order.
 */
@Service
public class AnonymousEvaluation {

    private final JdbcClient db;
    private final MarkService marks;
    private volatile byte[] key;

    public AnonymousEvaluation(JdbcClient db, MarkService marks) {
        this.db = db;
        this.marks = marks;
    }

    /**
     * A subject's answer scripts in the order the evaluators see them: students marked absent left out, dummy numbers
     * only, sorted by dummy number. An evaluator's bundle in the Dean's paper-correction allotment is a range of
     * positions in this list, so the faculty roster and the Dean's progress view both use it.
     */
    public List<MarkService.StudentMark> evaluationOrder(String deptKey, String semester, String subject,
                                                         String assessment) {
        Set<String> absent = new HashSet<>(db.sql("""
                        SELECT reg_no FROM script_absences WHERE dept_key = ? AND semester = ? AND subject_code = ?
                          AND assessment_type = ?
                        """).params(deptKey, Semesters.parse(semester), subject.trim().toUpperCase(Locale.ROOT),
                        assessment.trim()).query(String.class).list());
        // The requested assessment, not the row's: students without marks yet have none, and their dummy number must
        // match the one resolve() computes when the script is opened
        return marks.roster(deptKey, semester, subject, assessment).stream()
                .filter(m -> !absent.contains(m.regNo()))
                .map(m -> mask(m, deptKey, assessment.trim()))
                .sorted(Comparator.comparing(MarkService.StudentMark::regNo))
                .toList();
    }

    /** The dummy number of one student's script, e.g. "AS-3F9C21B7". */
    public String code(String deptKey, int semester, String subject, String assessment, String regNo) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key(), "HmacSHA256"));
            byte[] h = mac.doFinal((deptKey + "|" + semester + "|" + subject.toUpperCase(Locale.ROOT) + "|" + assessment
                    + "|" + regNo.toUpperCase(Locale.ROOT)).getBytes(StandardCharsets.UTF_8));
            return "AS-" + HexFormat.of().withUpperCase().formatHex(h, 0, 4);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** The roster as faculty see it: dummy numbers only, shuffled. */
    public List<MarkService.StudentMark> mask(List<MarkService.StudentMark> roster, String deptKey) {
        return roster.stream().map(m -> mask(m, deptKey)).sorted(Comparator.comparing(MarkService.StudentMark::regNo))
                .toList();
    }

    public MarkService.StudentMark mask(MarkService.StudentMark m, String deptKey) {
        return mask(m, deptKey, m.assessmentType());
    }

    private MarkService.StudentMark mask(MarkService.StudentMark m, String deptKey, String assessment) {
        String code = code(deptKey, Semesters.parse(m.semester()), m.subjectCode(), assessment, m.regNo());
        return new MarkService.StudentMark(code, "Answer script " + code, "", "", m.hasMarks(), m.partATotal(),
                m.partBCTotal(), m.grandTotal(), m.grade(), m.resultStatus(), m.partA(), m.partBC(), m.assessmentType(),
                m.deptKey(), m.deptName(), m.semester(), m.subjectCode(), m.subjectTitle(), m.examinerName(),
                m.examinerDesignation(), m.version(), m.remarks(), m.notAttempted());
    }

    /** The register number behind a dummy number of this department, semester, subject and assessment. */
    public String resolve(String deptKey, String semester, String subject, String assessment, String code) {
        int sem = Semesters.parse(semester);
        String wanted = code == null ? "" : code.trim().toUpperCase(Locale.ROOT);
        List<String> matches = db.sql("SELECT reg_no FROM students WHERE dept_key = ? AND semester = ?")
                .params(deptKey, sem).query(String.class).list().stream()
                .filter(reg -> code(deptKey, sem, subject.trim(), assessment.trim(), reg).equals(wanted)).toList();
        if (matches.size() != 1) throw ApiException.notFound("Answer script " + wanted + " not found");
        return matches.get(0);
    }

    /** The script with its first page (the cover with the student's details) replaced by a blank page. */
    public byte[] withoutCover(byte[] pdf, String code) {
        try (PDDocument doc = Loader.loadPDF(pdf)) {
            if (doc.isEncrypted()) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "This answer script is protected and cannot be shown anonymously. Ask the COE to upload it again.");
            }
            PDRectangle size = doc.getNumberOfPages() > 0 ? doc.getPage(0).getMediaBox() : PDRectangle.A4;
            if (doc.getNumberOfPages() > 0) doc.removePage(0);
            PDPage cover = new PDPage(size);
            try (PDPageContentStream cs = new PDPageContentStream(doc, cover)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 16);
                cs.newLineAtOffset(50, size.getHeight() - 90);
                cs.showText("Answer script " + code);
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 11);
                cs.newLineAtOffset(0, -24);
                cs.showText("The cover page is hidden for anonymous evaluation.");
                cs.endText();
            }
            if (doc.getNumberOfPages() == 0) doc.addPage(cover);
            else doc.getPages().insertBefore(cover, doc.getPage(0));
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "This answer script could not be prepared for anonymous evaluation. Ask the COE to upload it again.");
        }
    }

    private byte[] key() {
        byte[] k = key;
        if (k == null) {
            k = db.sql("SELECT secret FROM anonymization_key WHERE id = 1").query(String.class).single()
                    .getBytes(StandardCharsets.UTF_8);
            key = k;
        }
        return k;
    }
}
