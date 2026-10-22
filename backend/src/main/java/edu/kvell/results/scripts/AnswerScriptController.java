package edu.kvell.results.scripts;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Answer Scripts page: the COE uploads each student's scanned answer script (PDF) per subject and assessment.
 * Everything is limited to the COE's own college through {@link Departments#key}.
 */
@RestController
@RequestMapping("/api/admin/answer-scripts")
public class AnswerScriptController {

    /** One uploaded script (without the file itself). */
    public record ScriptInfo(String regNo, String subjectCode, String assessmentType, String fileName, int sizeBytes,
                             String uploadedBy, String uploadedAt) {
    }

    private static final Set<String> ASSESSMENTS = Set.of("IAT-1", "IAT-2", "End Semester");
    private static final long MAX_BYTES = 15L * 1024 * 1024;
    private static final byte[] PDF_MAGIC = "%PDF-".getBytes(StandardCharsets.US_ASCII);

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;

    public AnswerScriptController(JdbcClient db, Departments departments, AuditService audit) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
    }

    @GetMapping
    List<ScriptInfo> list(@RequestParam String dept, @RequestParam String semester, @RequestParam String assessment) {
        String deptKey = departments.key(dept);
        int sem = Semesters.parse(semester);
        return db.sql("""
                        SELECT reg_no, subject_code, assessment_type, file_name, size_bytes, uploaded_by, uploaded_at
                        FROM answer_scripts WHERE dept_key = ? AND semester = ? AND assessment_type = ?
                        ORDER BY reg_no, subject_code
                        """)
                .params(deptKey, sem, assessment(assessment))
                .query((rs, n) -> new ScriptInfo(rs.getString("reg_no"), rs.getString("subject_code"),
                        rs.getString("assessment_type"), rs.getString("file_name"), rs.getInt("size_bytes"),
                        rs.getString("uploaded_by"),
                        Semesters.display(rs.getObject("uploaded_at", OffsetDateTime.class))))
                .list();
    }

    /** One student marked absent for a subject and assessment. */
    public record Absence(String regNo, String subjectCode, String markedBy, String markedAt) {
    }

    public record AbsenceRequest(String dept, String semester, String subject, String regNo, String assessment,
                                 boolean absent) {
    }

    @GetMapping("/absences")
    List<Absence> absences(@RequestParam String dept, @RequestParam String semester, @RequestParam String assessment) {
        String deptKey = departments.key(dept);
        return db.sql("""
                        SELECT reg_no, subject_code, marked_by, marked_at FROM script_absences
                        WHERE dept_key = ? AND semester = ? AND assessment_type = ? ORDER BY reg_no, subject_code
                        """)
                .params(deptKey, Semesters.parse(semester), assessment(assessment))
                .query((rs, n) -> new Absence(rs.getString("reg_no"), rs.getString("subject_code"),
                        rs.getString("marked_by"), Semesters.display(rs.getObject("marked_at", OffsetDateTime.class))))
                .list();
    }

    /** Marks a student absent (or present again) for one subject and assessment; an uploaded script must be removed first. */
    @PutMapping("/absences")
    @Transactional
    Map<String, Object> setAbsent(@RequestBody AbsenceRequest r, HttpServletRequest http) {
        Target t = target(r.dept(), r.semester(), r.subject(), r.regNo(), r.assessment());
        CurrentUser user = CurrentUser.get();
        if (r.absent()) {
            if (exists(t)) {
                throw ApiException.conflict(t.regNo + " has an uploaded answer script for " + t.code
                        + ". Remove the script first to mark the student absent.");
            }
            if (db.sql("""
                            SELECT count(*) FROM marks WHERE dept_key = ? AND semester = ? AND subject_code = ? AND reg_no = ?
                              AND assessment_type = ?
                            """).params(t.deptKey, t.sem, t.code, t.regNo, t.assessment).query(Integer.class).single() > 0) {
                throw ApiException.conflict(t.regNo + " already has " + t.assessment + " marks for " + t.code + ".");
            }
            db.sql("""
                            INSERT INTO script_absences (dept_key, semester, subject_code, reg_no, assessment_type, marked_by)
                            VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
                            """).params(t.deptKey, t.sem, t.code, t.regNo, t.assessment, user.name()).update();
        } else {
            clearAbsence(t);
        }
        audit.record(user.username(), user.name(), r.absent() ? "MARKED_ABSENT" : "CLEARED_ABSENT",
                t.regNo + " " + t.code + " " + t.assessment,
                (r.absent() ? "Marked the student absent" : "Marked the student present again") + " for " + t.code + " ("
                        + t.assessment + ").", http.getRemoteAddr());
        return Map.of("regNo", t.regNo, "subjectCode", t.code, "absent", r.absent());
    }

    private boolean exists(Target t) {
        return db.sql("""
                        SELECT count(*) FROM answer_scripts
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND reg_no = ? AND assessment_type = ?
                        """).params(t.deptKey, t.sem, t.code, t.regNo, t.assessment).query(Integer.class).single() > 0;
    }

    private void clearAbsence(Target t) {
        db.sql("""
                        DELETE FROM script_absences
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND reg_no = ? AND assessment_type = ?
                        """).params(t.deptKey, t.sem, t.code, t.regNo, t.assessment).update();
    }

    /** Uploads (or replaces) one student's script for one subject and assessment. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    ScriptInfo upload(@RequestParam String dept, @RequestParam String semester, @RequestParam String subject,
                      @RequestParam String regNo, @RequestParam String assessment,
                      @RequestParam("file") MultipartFile file, HttpServletRequest http) throws IOException {
        Target t = target(dept, semester, subject, regNo, assessment);
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Choose a PDF file to upload");
        if (file.getSize() > MAX_BYTES) throw ApiException.badRequest("The PDF is larger than 15 MB");
        byte[] content = file.getBytes();
        if (content.length < PDF_MAGIC.length || !Arrays.equals(Arrays.copyOf(content, PDF_MAGIC.length), PDF_MAGIC)) {
            throw ApiException.badRequest("Only PDF files can be uploaded");
        }
        String name = cleanName(file.getOriginalFilename(), t);
        CurrentUser user = CurrentUser.get();
        db.sql("""
                        INSERT INTO answer_scripts (dept_key, semester, subject_code, reg_no, assessment_type, file_name,
                                                    size_bytes, content, uploaded_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (dept_key, semester, subject_code, reg_no, assessment_type) DO UPDATE SET
                            file_name = EXCLUDED.file_name, size_bytes = EXCLUDED.size_bytes,
                            content = EXCLUDED.content, uploaded_by = EXCLUDED.uploaded_by, uploaded_at = now()
                        """)
                .params(t.deptKey, t.sem, t.code, t.regNo, t.assessment, name, content.length, content, user.name())
                .update();
        // A script for the student means they were present
        clearAbsence(t);
        audit.record(user.username(), user.name(), "UPLOADED_ANSWER_SCRIPT", t.regNo + " " + t.code + " " + t.assessment,
                "Uploaded the scanned answer script (" + name + ", " + content.length / 1024 + " KB).",
                http.getRemoteAddr());
        return list(t.deptKey, Semesters.label(t.sem), t.assessment).stream()
                .filter(s -> s.regNo().equals(t.regNo) && s.subjectCode().equals(t.code)).findFirst().orElseThrow();
    }

    /** The PDF itself, shown inline in the browser (also used by the faculty endpoint for their own department). */
    @GetMapping("/file")
    public ResponseEntity<byte[]> file(@RequestParam String dept, @RequestParam String semester, @RequestParam String subject,
                                @RequestParam String regNo, @RequestParam String assessment) {
        Target t = target(dept, semester, subject, regNo, assessment);
        record Pdf(String name, byte[] content) {
        }
        Pdf pdf = db.sql("""
                        SELECT file_name, content FROM answer_scripts
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND reg_no = ? AND assessment_type = ?
                        """)
                .params(t.deptKey, t.sem, t.code, t.regNo, t.assessment)
                .query((rs, n) -> new Pdf(rs.getString("file_name"), rs.getBytes("content"))).optional()
                .orElseThrow(() -> ApiException.notFound("No answer script uploaded"));
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(pdf.name(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(pdf.content());
    }

    @DeleteMapping
    @Transactional
    ResponseEntity<Void> delete(@RequestParam String dept, @RequestParam String semester, @RequestParam String subject,
                                @RequestParam String regNo, @RequestParam String assessment, HttpServletRequest http) {
        Target t = target(dept, semester, subject, regNo, assessment);
        int deleted = db.sql("""
                        DELETE FROM answer_scripts
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND reg_no = ? AND assessment_type = ?
                        """)
                .params(t.deptKey, t.sem, t.code, t.regNo, t.assessment).update();
        if (deleted == 0) throw ApiException.notFound("No answer script uploaded");
        CurrentUser user = CurrentUser.get();
        audit.record(user.username(), user.name(), "DELETED_ANSWER_SCRIPT", t.regNo + " " + t.code + " " + t.assessment,
                "Removed the scanned answer script.", http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private record Target(String deptKey, int sem, String code, String regNo, String assessment) {
    }

    /** Checks the student and subject belong to the (COE's own) department and semester. */
    private Target target(String dept, String semester, String subject, String regNo, String assessment) {
        String deptKey = departments.key(dept);
        int sem = Semesters.parse(semester);
        String code = subject == null ? "" : subject.trim().toUpperCase(Locale.ROOT);
        String reg = regNo == null ? "" : regNo.trim().toUpperCase(Locale.ROOT);
        if (db.sql("SELECT count(*) FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?")
                .params(deptKey, sem, code).query(Integer.class).single() == 0) {
            throw ApiException.badRequest("Subject " + code + " is not in this department's catalog");
        }
        if (db.sql("SELECT count(*) FROM students WHERE reg_no = ? AND dept_key = ? AND semester = ?")
                .params(reg, deptKey, sem).query(Integer.class).single() == 0) {
            throw ApiException.notFound("Student " + reg + " is not in this department and semester");
        }
        return new Target(deptKey, sem, code, reg, assessment(assessment));
    }

    private static String assessment(String value) {
        String a = value == null ? "" : value.trim();
        if (!ASSESSMENTS.contains(a)) throw ApiException.badRequest("Assessment must be IAT-1, IAT-2 or End Semester");
        return a;
    }

    private static String cleanName(String original, Target t) {
        String name = original == null ? "" : original.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_").trim();
        if (name.isEmpty()) name = t.regNo + "_" + t.code + ".pdf";
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }
}
