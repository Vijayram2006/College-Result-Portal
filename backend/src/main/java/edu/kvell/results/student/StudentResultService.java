package edu.kvell.results.student;

import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Semesters;
import edu.kvell.results.grading.GradeCalculator;
import edu.kvell.results.grading.GradeCalculator.CreditPoints;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** A student's own published results. Unpublished (draft) batches are never visible here. */
@Service
public class StudentResultService {

    public record Profile(String regNo, String name, String departmentKey, String departmentName, String category,
                          String year, int currentSemester, String currentSemesterLabel, String academicYear) {
    }

    /** internal = Part A total, external = Part B + C total. */
    public record Subject(String code, String title, int credits, BigDecimal internal, BigDecimal external,
                          int total, String grade, int gradePoints, String status, String publishedAt) {
    }

    /**
     * One published assessment of a semester. IAT-1 / IAT-2 are internal assessment tests: they carry marks and
     * grades but no SGPA (sgpa is null). Only End Semester results have an SGPA and count towards the CGPA.
     */
    public record SemesterResult(int semester, String semesterLabel, String assessmentType, boolean internalAssessment,
                                 String examMonthYear, String academicYear, BigDecimal sgpa, int totalCredits,
                                 int earnedCredits, String result, int totalMarks, int maxMarks,
                                 List<Subject> subjects) {
    }

    /** withheld: the Super Admin is holding back this college's results, so no marks are sent. */
    public record StudentResults(Profile profile, List<SemesterResult> semesters, BigDecimal cgpa,
                                 String overallResult, int arrears, boolean withheld) {

        public StudentResults withheldCopy() {
            return new StudentResults(profile, List.of(), null, "WITHHELD", 0, true);
        }
    }

    private record Row(int semester, String assessment, String exam, String academicYear, Subject subject) {
    }

    private static final List<String> ASSESSMENT_ORDER = List.of("IAT-1", "IAT-2", "End Semester");

    /** A subject the student is registered for (their department and current semester). */
    public record RegisteredSubject(String code, String title, int credits, String category, String faculty) {
    }

    private final JdbcClient db;

    public StudentResultService(JdbcClient db) {
        this.db = db;
    }

    public List<RegisteredSubject> subjectsFor(String regNo) {
        return db.sql("""
                        SELECT j.code, j.title, j.credits, j.category, j.faculty
                        FROM students s
                        JOIN subjects j ON j.dept_key = s.dept_key AND j.semester = s.semester
                        WHERE s.reg_no = ? AND j.status = 'COE FINALIZED'
                        ORDER BY j.code
                        """)
                .param(regNo)
                .query((rs, n) -> new RegisteredSubject(rs.getString("code"), rs.getString("title"),
                        rs.getInt("credits"), rs.getString("category"), rs.getString("faculty")))
                .list();
    }

    public StudentResults resultsFor(String regNo) {
        Profile profile = db.sql("""
                        SELECT s.reg_no, s.name, s.dept_key, d.name AS dept_name, s.category, s.year_label,
                               s.semester, s.academic_year
                        FROM students s JOIN departments d ON d.dept_key = s.dept_key
                        WHERE s.reg_no = ?
                        """)
                .param(regNo)
                .query((rs, n) -> new Profile(rs.getString("reg_no"), rs.getString("name"), rs.getString("dept_key"),
                        rs.getString("dept_name"), rs.getString("category"), rs.getString("year_label"),
                        rs.getInt("semester"), Semesters.label(rs.getInt("semester")), rs.getString("academic_year")))
                .optional()
                .orElseThrow(() -> ApiException.notFound("Student record not found"));

        List<Row> rows = db.sql("""
                        SELECT b.semester, b.exam_month_year, b.academic_year, b.subject_code, b.subject_title,
                               b.published_at, r.credits, r.part_a_total, r.part_bc_total, r.total, r.grade,
                               r.grade_points, r.passed, coalesce(r.assessment_type, 'End Semester') AS assessment_type
                        FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                        WHERE r.reg_no = ? AND b.status = 'PUBLISHED'
                        ORDER BY b.semester, b.subject_code
                        """)
                .param(regNo)
                .query((rs, n) -> new Row(rs.getInt("semester"), rs.getString("assessment_type"),
                        rs.getString("exam_month_year"),
                        rs.getString("academic_year"),
                        new Subject(rs.getString("subject_code"), rs.getString("subject_title"), rs.getInt("credits"),
                                rs.getBigDecimal("part_a_total"), rs.getBigDecimal("part_bc_total"),
                                rs.getInt("total"), rs.getString("grade"), rs.getInt("grade_points"),
                                rs.getBoolean("passed") ? "PASS" : "FAIL",
                                Semesters.display(rs.getObject("published_at", java.time.OffsetDateTime.class)))))
                .list();

        // One entry per semester and assessment, in order: IAT-1, IAT-2, End Semester
        Map<String, List<Row>> groups = new TreeMap<>();
        rows.forEach(r -> groups.computeIfAbsent(String.format("%02d-%d", r.semester(), order(r.assessment())),
                k -> new ArrayList<>()).add(r));

        List<SemesterResult> semesters = new ArrayList<>();
        List<CreditPoints> endSemester = new ArrayList<>();
        int arrears = 0;
        for (List<Row> group : groups.values()) {
            Row first = group.getFirst();
            boolean internal = !"End Semester".equals(first.assessment());
            List<Subject> subjects = group.stream().map(Row::subject).toList();
            List<CreditPoints> points = subjects.stream()
                    .map(s -> new CreditPoints(s.credits(), s.gradePoints())).toList();
            int totalCredits = subjects.stream().mapToInt(Subject::credits).sum();
            int earned = subjects.stream().filter(s -> "PASS".equals(s.status())).mapToInt(Subject::credits).sum();
            long failed = subjects.stream().filter(s -> "FAIL".equals(s.status())).count();
            int totalMarks = subjects.stream().mapToInt(Subject::total).sum();
            if (!internal) {
                endSemester.addAll(points);
                arrears += (int) failed;
            }
            semesters.add(new SemesterResult(first.semester(), Semesters.label(first.semester()), first.assessment(),
                    internal, internal ? first.assessment() + " (Internal Assessment Test)" : first.exam(),
                    first.academicYear(), internal ? null : GradeCalculator.gpa(points), totalCredits, earned,
                    failed == 0 ? "PASS" : "FAIL", totalMarks, subjects.size() * 100, subjects));
        }
        // The CGPA comes from End Semester results only; internal assessments never count towards it
        BigDecimal cgpa = endSemester.isEmpty() ? null : GradeCalculator.gpa(endSemester);
        String overall = semesters.isEmpty() ? "AWAITING RESULTS"
                : endSemester.isEmpty() ? "INTERNAL ASSESSMENT"
                : GradeCalculator.classification(cgpa, arrears > 0);
        return new StudentResults(profile, semesters, cgpa, overall, arrears, false);
    }

    private static int order(String assessment) {
        int i = ASSESSMENT_ORDER.indexOf(assessment);
        return i < 0 ? ASSESSMENT_ORDER.size() : i;
    }
}
