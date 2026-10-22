package edu.kvell.results.faculty;

import edu.kvell.results.admin.ResultBatchService;
import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.marks.MarkService;
import edu.kvell.results.scripts.AnswerScriptController;
import edu.kvell.results.subjects.SubjectService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Faculty mark entry in the main portal. The department always comes from the faculty member's account, so they
 * can only see and mark their own department's students; publishing is left to the Controller of Examinations.
 */
@RestController
@RequestMapping("/api/faculty")
public class FacultyController {

    private final SubjectService subjects;
    private final MarkService marks;
    private final ResultBatchService results;
    private final AnswerScriptController scripts;
    private final org.springframework.jdbc.core.simple.JdbcClient db;

    private final edu.kvell.results.marks.AnonymousEvaluation anonymous;

    public FacultyController(SubjectService subjects, MarkService marks, ResultBatchService results,
                             AnswerScriptController scripts, org.springframework.jdbc.core.simple.JdbcClient db,
                             edu.kvell.results.marks.AnonymousEvaluation anonymous) {
        this.db = db;
        this.anonymous = anonymous;
        this.subjects = subjects;
        this.marks = marks;
        this.results = results;
        this.scripts = scripts;
    }

    /**
     * A student's scanned answer script, shown beside the marks form (read-only; the COE uploads them). regNo is the
     * script's dummy number; the cover page with the student's details is replaced by a blank page.
     */
    @GetMapping("/answer-scripts/file")
    org.springframework.http.ResponseEntity<byte[]> answerScript(@RequestParam String semester,
                                                                 @RequestParam String subject,
                                                                 @RequestParam String regNo,
                                                                 @RequestParam String assessment) {
        String dept = CurrentUser.get().deptKey();
        String reg = anonymous.resolve(dept, semester, subject, assessment, regNo);
        org.springframework.http.ResponseEntity<byte[]> pdf = scripts.file(dept, semester, subject, reg, assessment);
        String code = regNo.trim().toUpperCase(java.util.Locale.ROOT);
        return org.springframework.http.ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + code + ".pdf\"")
                .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(anonymous.withoutCover(pdf.getBody(), code));
    }

    /** One subject on the faculty dashboard, with live progress from the entered marks. */
    public record CourseRow(String id, String code, String title, String department, String deptShort,
                            String semester, String section, String type, int enrolledStudents,
                            int evaluatedStudents, double passRate, double avgScore, String status) {
    }

    /** The faculty dashboard: who is signed in, their department and HOD, and every subject's progress. */
    public record Overview(String facultyName, String username, String departmentKey, String departmentName,
                           String departmentCode, String hodName, String collegeKey, List<CourseRow> courses) {
    }

    @GetMapping("/overview")
    Overview overview() {
        CurrentUser user = CurrentUser.get();
        var dept = db.sql("SELECT name, coalesce(code, upper(dept_key)) AS code, coalesce(head_name, '') AS head "
                        + "FROM departments WHERE dept_key = ?")
                .param(user.deptKey()).query().singleRow();
        String hod = (String) dept.get("head");
        if (hod.isBlank()) {
            hod = db.sql("SELECT display_name FROM users WHERE role = 'HOD' AND dept_key = ? LIMIT 1")
                    .param(user.deptKey()).query(String.class).optional().orElse("—");
        }
        // Each subject shows its latest assessment with marks (End Semester, then IAT-2, then IAT-1)
        List<CourseRow> courses = db.sql("""
                        WITH latest AS (
                            SELECT subject_code, semester,
                                   (array['IAT-1', 'IAT-2', 'End Semester'])[max(CASE assessment_type
                                       WHEN 'IAT-1' THEN 1 WHEN 'IAT-2' THEN 2 ELSE 3 END)] AS assessment
                            FROM marks WHERE dept_key = :dept GROUP BY subject_code, semester)
                        SELECT j.id, j.code, j.title, j.semester, l.assessment,
                               (SELECT count(*) FROM students s
                                WHERE s.dept_key = j.dept_key AND s.semester = j.semester) AS enrolled,
                               count(m.id) AS evaluated,
                               count(m.id) FILTER (WHERE m.passed) AS passed,
                               coalesce(avg(m.grand_total), 0) AS avg_score,
                               (SELECT b.status FROM result_batches b WHERE b.dept_key = j.dept_key
                                  AND b.semester = j.semester AND b.subject_code = j.code
                                  AND b.assessment_type = l.assessment
                                ORDER BY b.uploaded_at DESC LIMIT 1) AS batch_status
                        FROM subjects j
                        LEFT JOIN latest l ON l.subject_code = j.code AND l.semester = j.semester
                        LEFT JOIN marks m ON m.dept_key = j.dept_key AND m.semester = j.semester
                                          AND m.subject_code = j.code AND m.assessment_type = l.assessment
                        WHERE j.dept_key = :dept
                        GROUP BY j.id, j.code, j.title, j.semester, l.assessment
                        ORDER BY j.semester, j.code
                        """)
                .param("dept", user.deptKey())
                .query((rs, n) -> {
                    int enrolled = rs.getInt("enrolled");
                    int evaluated = rs.getInt("evaluated");
                    String batch = rs.getString("batch_status");
                    String code = rs.getString("code");
                    String status = "PUBLISHED".equals(batch) ? "Published"
                            : "VALIDATED".equals(batch) ? "Forwarded to COE"
                            : evaluated == 0 ? "Not Started"
                            : evaluated >= enrolled && enrolled > 0 ? "Evaluation Complete" : "In Progress";
                    return new CourseRow("CRS-" + rs.getLong("id"), code, rs.getString("title"),
                            (String) dept.get("name"), (String) dept.get("code"),
                            edu.kvell.results.common.Semesters.label(rs.getInt("semester")),
                            rs.getString("assessment") == null ? "No marks yet" : rs.getString("assessment"),
                            code.endsWith("P") ? "Laboratory" : "Theory", enrolled, evaluated,
                            evaluated == 0 ? 0 : Math.round(rs.getInt("passed") * 1000.0 / evaluated) / 10.0,
                            Math.round(rs.getDouble("avg_score") * 10) / 10.0, status);
                })
                .list();
        return new Overview(user.name(), user.username(), user.deptKey(), (String) dept.get("name"),
                (String) dept.get("code"), hod, user.collegeKey(), courses);
    }

    @GetMapping("/subjects")
    List<SubjectService.SubjectItem> subjects() {
        return subjects.list(CurrentUser.get().deptKey());
    }

    @GetMapping("/marks")
    List<MarkService.StudentMark> roster(@RequestParam String semester, @RequestParam String subject,
                                         @RequestParam String assessment) {
        // Faculty evaluate anonymously: dummy numbers in a shuffled order
        String dept = CurrentUser.get().deptKey();
        java.util.Set<String> absent = new java.util.HashSet<>(db.sql("""
                        SELECT reg_no FROM script_absences WHERE dept_key = ? AND semester = ? AND subject_code = ?
                          AND assessment_type = ?
                        """).params(dept, edu.kvell.results.common.Semesters.parse(semester),
                        subject.trim().toUpperCase(java.util.Locale.ROOT), assessment.trim()).query(String.class).list());
        return anonymous.mask(marks.roster(dept, semester, subject, assessment).stream()
                .filter(m -> !absent.contains(m.regNo())).toList(), dept);
    }

    @PutMapping("/marks")
    MarkService.StudentMark save(@RequestBody MarkService.MarkRequest r, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        // regNo is the script's dummy number
        String reg = anonymous.resolve(user.deptKey(), r.semester(), r.subjectCode(), r.assessmentType(), r.regNo());
        if (db.sql("""
                        SELECT count(*) FROM script_absences WHERE dept_key = ? AND semester = ? AND subject_code = ?
                          AND reg_no = ? AND assessment_type = ?
                        """).params(user.deptKey(), edu.kvell.results.common.Semesters.parse(r.semester()),
                        r.subjectCode().trim().toUpperCase(java.util.Locale.ROOT), reg, r.assessmentType().trim())
                .query(Integer.class).single() > 0) {
            throw edu.kvell.results.common.ApiException.conflict("This student was marked absent by the COE");
        }
        MarkService.MarkRequest own = new MarkService.MarkRequest(user.deptKey(), r.semester(), r.subjectCode(),
                reg, r.assessmentType(), r.partA(), r.partBC(), r.examinerName(), r.examinerDesignation(),
                r.expectedVersion());
        return anonymous.mask(marks.save(own, user, http.getRemoteAddr()), user.deptKey());
    }

    /** Forward one subject's marks to the COE for verification. */
    @PostMapping("/forward")
    ResultBatchService.ResultBatch forward(@RequestBody ResultBatchService.ForwardRequest r, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        ResultBatchService.ResultBatch b = results.forward(new ResultBatchService.ForwardRequest(user.deptKey(),
                r.semester(), r.subjectCode(), r.academicYear(), r.assessmentType()), user, http.getRemoteAddr());
        // The students' names and register numbers stay hidden from faculty
        return new ResultBatchService.ResultBatch(b.id(), b.batchTitle(), b.departmentKey(), b.departmentName(),
                b.semester(), b.semesterNumber(), b.academicYear(), b.examMonthYear(), b.subjectCode(), b.subjectTitle(),
                b.uploadDate(), b.uploadedBy(), b.totalStudents(), b.passedStudents(), b.passPercentage(),
                b.publicationStatus(), b.publishedAt(), b.publishedBy(), List.of(), b.assessmentType());
    }

    /** Published results of the faculty member's own department, with every student's marks, for download. */
    @GetMapping("/published-results")
    List<ResultBatchService.ResultBatch> publishedResults() {
        return results.publishedForDepartment(CurrentUser.get().deptKey());
    }

    /** Forwarding / publication state of every subject of the faculty member's department. */
    @GetMapping("/status")
    List<ResultBatchService.PublishRow> status(@RequestParam String semester, @RequestParam String assessment) {
        return results.publishStatus(CurrentUser.get().deptKey(), semester, assessment);
    }
}
