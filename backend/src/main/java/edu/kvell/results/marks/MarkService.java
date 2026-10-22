package edu.kvell.results.marks;

import static edu.kvell.results.grading.GradeCalculator.FIRST_BC_QUESTION;
import static edu.kvell.results.grading.GradeCalculator.LAST_BC_QUESTION;
import static edu.kvell.results.grading.GradeCalculator.PART_A_MAX;
import static edu.kvell.results.grading.GradeCalculator.PART_A_QUESTIONS;
import static edu.kvell.results.grading.GradeCalculator.SUBDIVISION_MAX;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.governance.GovernanceService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import edu.kvell.results.grading.GradeCalculator;
import java.math.BigDecimal;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Question-wise answer-script marks, one evaluation per student per subject. */
@Service
public class MarkService {

    public record Subdivisions(Double i, Double ii, Double iii) {
    }

    public record Question(Subdivisions a, Subdivisions b) {
    }

    public record MarkRequest(String deptKey, String semester, String subjectCode, String regNo,
                              String assessmentType, List<Double> partA, Map<String, Question> partBC,
                              String examinerName, String examinerDesignation, Integer expectedVersion) {
    }

    /** One row of the Mark Entry roster; matches the admin panel's StudentMarkData. */
    public record StudentMark(String regNo, String name, String dob, String category, boolean hasMarks,
                              double partATotal, double partBCTotal, int grandTotal, String grade,
                              String resultStatus, List<Double> partA, Map<String, Question> partBC,
                              String assessmentType, String deptKey, String deptName, String semester,
                              String subjectCode, String subjectTitle, String examinerName,
                              String examinerDesignation, int version) {
    }

    private static final Set<String> ASSESSMENTS = Set.of("IAT-1", "IAT-2", "End Semester");
    private static final int BC_VALUES = (LAST_BC_QUESTION - FIRST_BC_QUESTION + 1) * 6;

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final GovernanceService governance;

    public MarkService(JdbcClient db, Departments departments, AuditService audit, GovernanceService governance) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
        this.governance = governance;
    }

    /** Every entered answer script (all departments and subjects), for the Analytics page. */
    public List<StudentMark> allEntered() {
        return db.sql("""
                        SELECT s.reg_no, s.name, s.dob, s.category, m.assessment_type, m.part_a, m.part_bc,
                               m.part_a_total, m.part_bc_total, m.grand_total, m.grade, m.passed,
                               m.examiner_name, m.examiner_designation, m.version,
                               m.dept_key, d.name AS dept_name, m.semester, m.subject_code, m.subject_title
                        FROM marks m
                        JOIN students s ON s.reg_no = m.reg_no
                        JOIN departments d ON d.dept_key = m.dept_key
                        WHERE """ + departments.inCollege("m.dept_key") + """
                        ORDER BY m.dept_key, m.subject_code, s.reg_no
                        """)
                .query((rs, n) -> toMark(rs, rs.getString("dept_key"), rs.getString("dept_name"),
                        rs.getInt("semester"), rs.getString("subject_code"), rs.getString("subject_title")))
                .list();
    }

    /** Every entered mark of one department (HOD analytics); dates of birth are left out, as they are login secrets. */
    public List<StudentMark> allEnteredForDepartment(String deptKey) {
        return db.sql("""
                        SELECT s.reg_no, s.name, CAST(NULL AS DATE) AS dob, s.category, m.assessment_type, m.part_a, m.part_bc,
                               m.part_a_total, m.part_bc_total, m.grand_total, m.grade, m.passed,
                               m.examiner_name, m.examiner_designation, m.version,
                               m.dept_key, d.name AS dept_name, m.semester, m.subject_code, m.subject_title
                        FROM marks m
                        JOIN students s ON s.reg_no = m.reg_no
                        JOIN departments d ON d.dept_key = m.dept_key
                        WHERE m.dept_key = ?
                        ORDER BY m.subject_code, s.reg_no
                        """)
                .param(deptKey)
                .query((rs, n) -> toMark(rs, rs.getString("dept_key"), rs.getString("dept_name"),
                        rs.getInt("semester"), rs.getString("subject_code"), rs.getString("subject_title")))
                .list();
    }

    /** Every student of the department and semester, with their marks for the subject and assessment if entered. */
    public List<StudentMark> roster(String dept, String semester, String subjectCode, String assessmentType) {
        String deptKey = departments.key(dept);
        int sem = Semesters.parse(semester);
        String code = normalizeCode(subjectCode);
        String assessment = assessment(assessmentType);
        String deptName = departments.name(deptKey);
        String title = subjectTitle(deptKey, sem, code);
        return db.sql("""
                        SELECT s.reg_no, s.name, s.dob, s.category, m.assessment_type, m.part_a, m.part_bc,
                               m.part_a_total, m.part_bc_total, m.grand_total, m.grade, m.passed,
                               m.examiner_name, m.examiner_designation, m.version
                        FROM students s
                        LEFT JOIN marks m ON m.reg_no = s.reg_no AND m.dept_key = s.dept_key
                                         AND m.semester = s.semester AND m.subject_code = :code
                                         AND m.assessment_type = :assessment
                        WHERE s.dept_key = :dept AND s.semester = :sem
                        ORDER BY (s.category = 'lateral'), s.reg_no
                        """)
                .param("dept", deptKey).param("sem", sem).param("code", code).param("assessment", assessment)
                .query((rs, n) -> toMark(rs, deptKey, deptName, sem, code, title))
                .list();
    }

    /** Validates and scores one answer script on the server, then saves it (replacing any earlier entry). */
    @Transactional
    public StudentMark save(MarkRequest req, CurrentUser user, String ip) {
        if (req == null) throw ApiException.badRequest("Marks are required");
        String deptKey = departments.key(req.deptKey());
        int sem = Semesters.parse(req.semester());
        String code = normalizeCode(req.subjectCode());
        String title = subjectTitle(deptKey, sem, code);
        String regNo = req.regNo() == null ? "" : req.regNo().trim().toUpperCase(Locale.ROOT);
        String studentName = db.sql("SELECT name FROM students WHERE reg_no = ? AND dept_key = ? AND semester = ?")
                .params(regNo, deptKey, sem).query(String.class).optional()
                .orElseThrow(() -> ApiException.notFound("Student " + regNo + " is not in "
                        + deptKey.toUpperCase(Locale.ROOT) + " " + Semesters.label(sem)));
        String assessment = assessment(req.assessmentType());
        String examiner = text(req.examinerName(), "Examiner name");
        String designation = text(req.examinerDesignation(), "Examiner designation");

        double[] partA = partA(req.partA());
        double[] partBC = partBC(req.partBC());
        double partATotal = 0;
        for (double v : partA) partATotal += v;
        double partBCTotal = 0;
        for (int q = 0; q < BC_VALUES / 6; q++) {
            partBCTotal += GradeCalculator.questionTotal(
                    new double[] {partBC[q * 6], partBC[q * 6 + 1], partBC[q * 6 + 2]},
                    new double[] {partBC[q * 6 + 3], partBC[q * 6 + 4], partBC[q * 6 + 5]});
        }
        GradeCalculator.Grade grade = GradeCalculator.grade(partATotal, partBCTotal);
        if (user.role() == CurrentUser.Role.FACULTY) {
            checkPartLocks(deptKey, sem, code, regNo, assessment, partA, partBC);
        }

        // Optimistic locking: refuse to overwrite an entry someone else saved after this form was loaded
        Map<String, Object> before = db.sql("""
                        SELECT version, grand_total, grade, part_a_total, part_bc_total FROM marks
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND reg_no = ? AND assessment_type = ?
                        FOR UPDATE
                        """)
                .params(deptKey, sem, code, regNo, assessment).query().listOfRows().stream().findFirst().orElse(null);
        int currentVersion = before == null ? 0 : ((Number) before.get("version")).intValue();
        if (req.expectedVersion() != null && req.expectedVersion() != currentVersion) {
            throw ApiException.conflict("These marks were changed by someone else after you opened them. "
                    + "Reload the student's marks and enter them again.");
        }

        db.sql("""
                        INSERT INTO marks (dept_key, semester, subject_code, subject_title, reg_no, assessment_type,
                                           part_a, part_bc, part_a_total, part_bc_total, grand_total, grade, passed,
                                           examiner_name, examiner_designation, entered_by)
                        VALUES (?, ?, ?, ?, ?, ?, CAST(? AS NUMERIC[]), CAST(? AS NUMERIC[]), ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (dept_key, semester, subject_code, reg_no, assessment_type) DO UPDATE SET
                            subject_title = EXCLUDED.subject_title,
                            part_a = EXCLUDED.part_a, part_bc = EXCLUDED.part_bc,
                            part_a_total = EXCLUDED.part_a_total, part_bc_total = EXCLUDED.part_bc_total,
                            grand_total = EXCLUDED.grand_total, grade = EXCLUDED.grade, passed = EXCLUDED.passed,
                            examiner_name = EXCLUDED.examiner_name,
                            examiner_designation = EXCLUDED.examiner_designation,
                            entered_by = EXCLUDED.entered_by, entered_at = now(), version = marks.version + 1
                        """)
                .params(deptKey, sem, code, title, regNo, assessment, pgArray(partA), pgArray(partBC),
                        BigDecimal.valueOf(partATotal), BigDecimal.valueOf(partBCTotal), grade.total(),
                        grade.letter(), grade.passed(), examiner, designation, user.username())
                .update();
        audit.record(user.username(), user.name(), "ENTERED_STUDENT_MARKS", regNo + " (" + studentName + ")",
                "Entered " + assessment + " marks in " + code + " " + title + ": total " + grade.total()
                        + "/100, grade " + grade.letter() + " (" + (grade.passed() ? "PASS" : "FAIL")
                        + "). Evaluated by " + examiner + " (" + designation + ").", ip,
                before == null ? null : "Part A " + before.get("part_a_total") + ", Part B+C " + before.get("part_bc_total")
                        + ", total " + before.get("grand_total") + ", grade " + before.get("grade"),
                "Part A " + BigDecimal.valueOf(partATotal) + ", Part B+C " + BigDecimal.valueOf(partBCTotal)
                        + ", total " + grade.total() + ", grade " + grade.letter());
        return roster(deptKey, Semesters.label(sem), code, assessment).stream().filter(m -> m.regNo().equals(regNo))
                .findFirst().orElseThrow();
    }

    public String subjectTitle(String deptKey, int sem, String code) {
        return db.sql("SELECT title FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?")
                .params(deptKey, sem, code).query(String.class).optional()
                .orElseThrow(() -> ApiException.badRequest("Subject " + code + " is not in the "
                        + deptKey.toUpperCase(Locale.ROOT) + " " + Semesters.label(sem)
                        + " catalog. Add it on the Subjects page first."));
    }

    /** "IAT-1", "IAT-2" or "End Semester" (anything else is refused). */
    public static String assessment(String value) {
        String a = value == null ? "" : value.trim();
        if (!ASSESSMENTS.contains(a)) throw ApiException.badRequest("Choose the assessment: IAT-1, IAT-2 or End Semester");
        return a;
    }

    public static String normalizeCode(String code) {
        if (code == null || code.isBlank()) throw ApiException.badRequest("Subject code is required");
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private static double[] partA(List<Double> values) {
        if (values == null || values.size() != PART_A_QUESTIONS) {
            throw ApiException.badRequest("Part A needs marks for all " + PART_A_QUESTIONS + " questions");
        }
        double[] out = new double[PART_A_QUESTIONS];
        for (int i = 0; i < out.length; i++) {
            out[i] = mark(values.get(i), PART_A_MAX, "Part A question " + (i + 1));
        }
        return out;
    }

    /** Flattened as q11(a.i, a.ii, a.iii, b.i, b.ii, b.iii), q12(...), ... q16(...). */
    private static double[] partBC(Map<String, Question> questions) {
        if (questions == null) throw ApiException.badRequest("Part B + C marks are required");
        double[] out = new double[BC_VALUES];
        for (int q = FIRST_BC_QUESTION; q <= LAST_BC_QUESTION; q++) {
            Question question = questions.get(String.valueOf(q));
            if (question == null) throw ApiException.badRequest("Question " + q + " is missing");
            int base = (q - FIRST_BC_QUESTION) * 6;
            Subdivisions a = question.a() == null ? new Subdivisions(0.0, 0.0, 0.0) : question.a();
            Subdivisions b = question.b() == null ? new Subdivisions(0.0, 0.0, 0.0) : question.b();
            out[base] = mark(a.i(), SUBDIVISION_MAX, "Q" + q + "(a)(i)");
            out[base + 1] = mark(a.ii(), SUBDIVISION_MAX, "Q" + q + "(a)(ii)");
            out[base + 2] = mark(a.iii(), SUBDIVISION_MAX, "Q" + q + "(a)(iii)");
            out[base + 3] = mark(b.i(), SUBDIVISION_MAX, "Q" + q + "(b)(i)");
            out[base + 4] = mark(b.ii(), SUBDIVISION_MAX, "Q" + q + "(b)(ii)");
            out[base + 5] = mark(b.iii(), SUBDIVISION_MAX, "Q" + q + "(b)(iii)");
            // Each question is answered as choice (a) OR choice (b); marks in both would be a data-entry mistake
            double sumA = out[base] + out[base + 1] + out[base + 2];
            double sumB = out[base + 3] + out[base + 4] + out[base + 5];
            if (sumA > 0 && sumB > 0) {
                throw ApiException.badRequest("Question " + q + ": enter marks for either (a) or (b), not both");
            }
            // R2026 pattern: Q11-15 carry 13 marks, Q16 carries 15
            int questionMax = q == LAST_BC_QUESTION ? 15 : 13;
            if (Math.max(sumA, sumB) > questionMax) {
                throw ApiException.badRequest("Question " + q + ": the marks add up to " + Math.max(sumA, sumB)
                        + ", more than the question's " + questionMax);
            }
        }
        return out;
    }

    private static double mark(Double value, double max, String field) {
        double v = value == null ? 0 : value;
        if (Double.isNaN(v) || v < 0 || v > max) {
            throw ApiException.badRequest(field + " must be between 0 and " + (int) max);
        }
        // Half marks are the finest step an examiner awards.
        return Math.round(v * 2) / 2.0;
    }

    private static String text(String value, String field) {
        if (value == null || value.isBlank()) throw ApiException.badRequest(field + " is required");
        String v = value.trim();
        if (v.length() > 120) throw ApiException.badRequest(field + " is too long");
        return v;
    }

    private static String pgArray(double[] values) {
        StringJoiner joiner = new StringJoiner(",", "{", "}");
        for (double v : values) joiner.add(BigDecimal.valueOf(v).toPlainString());
        return joiner.toString();
    }

    private static StudentMark toMark(ResultSet rs, String deptKey, String deptName, int sem, String code,
                                      String title) throws SQLException {
        String regNo = rs.getString("reg_no");
        LocalDate dobValue = rs.getObject("dob", LocalDate.class);
        String dob = dobValue == null ? "" : dobValue.toString();
        String assessment = rs.getString("assessment_type");
        if (assessment == null) {
            return new StudentMark(regNo, rs.getString("name"), dob, rs.getString("category"), false, 0, 0, 0, "—",
                    "FAIL", zeros(PART_A_QUESTIONS), emptyBC(), null, deptKey, deptName, Semesters.label(sem), code,
                    title, null, null, 0);
        }
        // A row saved with the wrong number of values (an older or outside writer) must not break the whole roster:
        // missing values read as 0 and extra ones are ignored, so the COE can open the student and save it again.
        List<Double> partA = fixedLength(toList(rs.getArray("part_a")), PART_A_QUESTIONS);
        List<Double> flat = fixedLength(toList(rs.getArray("part_bc")), BC_VALUES);
        Map<String, Question> partBC = new LinkedHashMap<>();
        for (int q = FIRST_BC_QUESTION; q <= LAST_BC_QUESTION; q++) {
            int b = (q - FIRST_BC_QUESTION) * 6;
            partBC.put(String.valueOf(q), new Question(
                    new Subdivisions(flat.get(b), flat.get(b + 1), flat.get(b + 2)),
                    new Subdivisions(flat.get(b + 3), flat.get(b + 4), flat.get(b + 5))));
        }
        return new StudentMark(regNo, rs.getString("name"), dob, rs.getString("category"), true,
                rs.getBigDecimal("part_a_total").doubleValue(), rs.getBigDecimal("part_bc_total").doubleValue(),
                rs.getInt("grand_total"), rs.getString("grade"), rs.getBoolean("passed") ? "PASS" : "FAIL", partA,
                partBC, assessment, deptKey, deptName, Semesters.label(sem), code, title,
                rs.getString("examiner_name"), rs.getString("examiner_designation"), rs.getInt("version"));
    }

    /** The list padded with zeros, or cut, to exactly length values. */
    static List<Double> fixedLength(List<Double> values, int length) {
        List<Double> out = new java.util.ArrayList<>(length);
        for (int i = 0; i < length; i++) out.add(i < values.size() && values.get(i) != null ? values.get(i) : 0.0);
        return out;
    }

    /**
     * The Super Admin can stop faculty changing Part A (internal) or Part B + C (external) marks. A locked part must
     * stay exactly as it was saved (or empty, for a script not marked yet).
     */
    private void checkPartLocks(String deptKey, int sem, String code, String regNo, String assessment,
                                double[] partA, double[] partBC) {
        boolean mayA = governance.facultyMayEditPartA();
        boolean mayBC = governance.facultyMayEditPartBC();
        if (mayA && mayBC) return;
        double[][] saved = db.sql("""
                        SELECT part_a, part_bc FROM marks
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND reg_no = ? AND assessment_type = ?
                        """)
                .params(deptKey, sem, code, regNo, assessment)
                .query((rs, n) -> new double[][] {doubles(rs.getArray("part_a")), doubles(rs.getArray("part_bc"))})
                .optional()
                .orElse(new double[][] {new double[partA.length], new double[partBC.length]});
        if (!mayA && !java.util.Arrays.equals(saved[0], partA)) {
            throw new ApiException(org.springframework.http.HttpStatus.LOCKED,
                    "Part A (internal) marks are locked by the Controller of Examinations.");
        }
        if (!mayBC && !java.util.Arrays.equals(saved[1], partBC)) {
            throw new ApiException(org.springframework.http.HttpStatus.LOCKED,
                    "Part B + C (external) marks are locked by the Controller of Examinations.");
        }
    }

    private static double[] doubles(Array array) throws SQLException {
        return toList(array).stream().mapToDouble(Double::doubleValue).toArray();
    }

    private static List<Double> toList(Array array) throws SQLException {
        Object[] values = (Object[]) array.getArray();
        List<Double> out = new ArrayList<>(values.length);
        for (Object v : values) out.add(((BigDecimal) v).doubleValue());
        return out;
    }

    private static List<Double> zeros(int n) {
        List<Double> out = new ArrayList<>(n);
        for (int i = 0; i < n; i++) out.add(0.0);
        return out;
    }

    private static Map<String, Question> emptyBC() {
        Map<String, Question> out = new LinkedHashMap<>();
        for (int q = FIRST_BC_QUESTION; q <= LAST_BC_QUESTION; q++) {
            out.put(String.valueOf(q), new Question(new Subdivisions(0.0, 0.0, 0.0), new Subdivisions(0.0, 0.0, 0.0)));
        }
        return out;
    }
}
