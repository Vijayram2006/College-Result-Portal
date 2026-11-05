package edu.kvell.results.reports;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Departments;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Report Download centre. Each report is built from live data and limited to the signed-in user's reach: a student's
 * own record, a faculty member's subjects and mentees, the HOD's department, the Associate Dean's college. The screen
 * turns the rows into Excel, PDF or CSV and logs each download.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportsController {

    public record Dataset(String reportKey, String title, String subtitle, String generatedBy, String role, String generatedAt,
                          List<String> columns, List<Map<String, Object>> rows, Map<String, Object> summaryStats) {
    }

    public record LogRequest(String reportType, String fileFormat, String filtersApplied) {
    }

    public record LogView(long id, String username, String role, String reportType, String fileFormat, String filtersApplied,
                          String downloadedAt) {
    }

    private final JdbcClient db;
    private final Departments departments;

    public ReportsController(JdbcClient db, Departments departments) {
        this.db = db;
        this.departments = departments;
    }

    @GetMapping("/generate")
    Dataset generate(@RequestParam String reportKey) {
        CurrentUser me = CurrentUser.get();
        String key = reportKey.toUpperCase(Locale.ROOT);
        Role need = key.startsWith("STUDENT_") ? Role.STUDENT : key.startsWith("FACULTY_") ? Role.FACULTY
                : key.startsWith("HOD_") ? Role.HOD : key.startsWith("DEAN_") ? Role.DEAN : null;
        if (need == null) {
            return empty(me, key, "Examination office report", "This report is produced in the COE panel.");
        }
        boolean allowed = me.role() == need || (need == Role.FACULTY && me.role() == Role.HOD);
        if (!allowed) throw new ApiException(HttpStatus.FORBIDDEN, "This report is not available to you");
        return switch (key) {
            case "STUDENT_ACADEMIC_TRANSCRIPT" -> rows(me, key, "Academic transcript", "Published results of " + me.regNo(),
                    List.of("Semester", "Exam", "Subject Code", "Subject Title", "Credits", "Total", "Grade", "Result"), """
                            SELECT b.semester AS "Semester", b.exam_month_year AS "Exam", b.subject_code AS "Subject Code",
                                   b.subject_title AS "Subject Title", r.credits AS "Credits", r.total AS "Total", r.grade AS "Grade",
                                   CASE WHEN r.passed THEN 'PASS' ELSE 'FAIL' END AS "Result"
                            FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                            WHERE r.reg_no = ? AND b.status = 'PUBLISHED' ORDER BY b.semester, b.subject_code
                            """, me.regNo());
            case "STUDENT_ATTENDANCE_SUMMARY" -> rows(me, key, "Attendance summary", "Approved monthly registers of " + me.regNo(),
                    List.of("Subject Code", "Subject Title", "Classes", "Present", "On Duty", "Absent", "Attendance %"), """
                            SELECT b.subject_code AS "Subject Code", coalesce(j.title, b.subject_code) AS "Subject Title",
                                   (SELECT count(*) FROM (SELECT DISTINCT x.batch_id, x.attendance_date, x.session_slot FROM attendance_records x
                                     JOIN attendance_batches y ON y.batch_id = x.batch_id WHERE y.status = 'ADEAN_APPROVED'
                                     AND y.dept_key = b.dept_key AND y.semester = b.semester AND y.subject_code = b.subject_code) c) AS "Classes",
                                   count(*) FILTER (WHERE r.status = 'PRESENT') AS "Present", count(*) FILTER (WHERE r.status = 'ON_DUTY') AS "On Duty",
                                   count(*) FILTER (WHERE r.status = 'ABSENT') AS "Absent", 0 AS "Attendance %"
                            FROM attendance_records r JOIN attendance_batches b ON b.batch_id = r.batch_id
                            LEFT JOIN subjects j ON j.dept_key = b.dept_key AND j.semester = b.semester AND j.code = b.subject_code
                            WHERE r.reg_no = ? AND b.status = 'ADEAN_APPROVED'
                            GROUP BY b.dept_key, b.semester, b.subject_code, j.title ORDER BY 1
                            """, me.regNo());
            case "STUDENT_INTERNAL_ASSESSMENT" -> rows(me, key, "Internal assessment", "Internal marks of " + me.regNo(),
                    List.of("Subject Code", "Subject Title", "Component", "Marks"), """
                            SELECT m.subject_code AS "Subject Code", coalesce(j.title, m.subject_code) AS "Subject Title",
                                   initcap(m.component) AS "Component", m.value AS "Marks"
                            FROM internal_marks m LEFT JOIN subjects j ON j.dept_key = m.dept_key AND j.semester = m.semester AND j.code = m.subject_code
                            WHERE m.reg_no = ? ORDER BY m.subject_code, m.component
                            """, me.regNo());
            case "STUDENT_FEE_SUMMARY" -> rows(me, key, "Fee summary", "Fee demands and payments of " + me.regNo(),
                    List.of("Fee", "Amount", "Concession", "Paid", "Balance", "Due Date"), """
                            SELECT h.name AS "Fee", d.amount AS "Amount", d.concession AS "Concession", d.paid AS "Paid",
                                   d.amount - d.concession - d.paid AS "Balance", d.due_date::text AS "Due Date"
                            FROM fee_demands d JOIN fee_heads h ON h.id = d.head_id WHERE d.reg_no = ? ORDER BY d.due_date, h.name
                            """, me.regNo());
            case "STUDENT_MENTORING_RECORD" -> rows(me, key, "Mentoring record", "Sessions with the mentor of " + me.regNo(),
                    List.of("Date", "Mentor", "Type", "Mode", "Topics Discussed", "Guidance", "Next Review"), """
                            SELECT s.session_date::text AS "Date", u.display_name AS "Mentor", s.session_type AS "Type", s.meeting_mode AS "Mode",
                                   s.topics_discussed AS "Topics Discussed", s.guidance_notes AS "Guidance",
                                   coalesce(s.next_review_date::text, '') AS "Next Review"
                            FROM mentoring_sessions s JOIN users u ON u.id = s.faculty_user_id WHERE s.reg_no = ? ORDER BY s.session_date DESC
                            """, me.regNo());
            case "FACULTY_ATTENDANCE_REPORT" -> rows(me, key, "Attendance registers", "Monthly registers marked by " + me.name(),
                    List.of("Department", "Semester", "Subject Code", "Month", "Classes", "Status", "HOD", "Associate Dean"), """
                            SELECT upper(b.dept_key) AS "Department", b.semester AS "Semester", b.subject_code AS "Subject Code",
                                   to_char(make_date(b.year, b.month, 1), 'Mon YYYY') AS "Month",
                                   (SELECT count(*) FROM (SELECT DISTINCT attendance_date, session_slot FROM attendance_records x
                                     WHERE x.batch_id = b.batch_id) c) AS "Classes",
                                   replace(b.status, '_', ' ') AS "Status", coalesce(b.hod_name, '') AS "HOD", coalesce(b.adean_name, '') AS "Associate Dean"
                            FROM attendance_batches b WHERE b.faculty_user_id = ? ORDER BY b.year DESC, b.month DESC, b.subject_code
                            """, me.id());
            case "FACULTY_INTERNAL_MARKS" -> rows(me, key, "Internal marks", "Internal marks of the subjects taught by " + me.name(),
                    List.of("Department", "Semester", "Subject Code", "Component", "Students", "Average", "Highest", "Lowest"), """
                            SELECT upper(m.dept_key) AS "Department", m.semester AS "Semester", m.subject_code AS "Subject Code",
                                   initcap(m.component) AS "Component", count(*) AS "Students", round(avg(m.value), 1) AS "Average",
                                   max(m.value) AS "Highest", min(m.value) AS "Lowest"
                            FROM internal_marks m JOIN faculty_subjects f ON f.dept_key = m.dept_key AND f.semester = m.semester
                                 AND f.subject_code = m.subject_code AND f.user_id = ?
                            GROUP BY m.dept_key, m.semester, m.subject_code, m.component ORDER BY 1, 2, 3, 4
                            """, me.id());
            case "FACULTY_COURSE_MATERIAL" -> rows(me, key, "Course materials", "Materials published by " + me.name(),
                    List.of("Department", "Semester", "Subject Code", "Unit", "Type", "Title", "Downloads", "Published On"), """
                            SELECT upper(m.dept_key) AS "Department", m.semester AS "Semester", m.subject_code AS "Subject Code",
                                   m.unit_number AS "Unit", replace(m.material_type, '_', ' ') AS "Type", m.title AS "Title",
                                   m.download_count AS "Downloads", to_char(m.created_at, 'DD-Mon-YYYY') AS "Published On"
                            FROM course_materials m WHERE m.faculty_user_id = ? ORDER BY m.created_at DESC
                            """, me.id());
            case "FACULTY_MENTORING_LOG" -> rows(me, key, "Mentoring log", "Sessions recorded by " + me.name(),
                    List.of("Date", "Register No", "Student", "Type", "Mode", "Topics Discussed", "Action Items"), """
                            SELECT s.session_date::text AS "Date", s.reg_no AS "Register No", st.name AS "Student", s.session_type AS "Type",
                                   s.meeting_mode AS "Mode", s.topics_discussed AS "Topics Discussed", coalesce(s.action_items, '') AS "Action Items"
                            FROM mentoring_sessions s JOIN students st ON st.reg_no = s.reg_no WHERE s.faculty_user_id = ?
                            ORDER BY s.session_date DESC
                            """, me.id());
            case "HOD_RESULT_ANALYSIS" -> rows(me, key, "Result analysis", "Published results of " + departments.name(me.deptKey()),
                    List.of("Semester", "Exam", "Subject Code", "Subject Title", "Appeared", "Passed", "Failed", "Pass %"), """
                            SELECT b.semester AS "Semester", b.exam_month_year AS "Exam", b.subject_code AS "Subject Code",
                                   b.subject_title AS "Subject Title", count(r.id) AS "Appeared", count(r.id) FILTER (WHERE r.passed) AS "Passed",
                                   count(r.id) FILTER (WHERE NOT r.passed) AS "Failed",
                                   round(100.0 * count(r.id) FILTER (WHERE r.passed) / nullif(count(r.id), 0), 1) AS "Pass %"
                            FROM result_batches b LEFT JOIN result_records r ON r.batch_id = b.id
                            WHERE b.dept_key = ? AND b.status = 'PUBLISHED'
                            GROUP BY b.id, b.semester, b.exam_month_year, b.subject_code, b.subject_title ORDER BY 1, 3
                            """, me.deptKey());
            case "HOD_MENTORING_AUDIT" -> rows(me, key, "Mentoring audit", "Mentors of " + departments.name(me.deptKey()),
                    List.of("Mentor", "Username", "Mentees", "Waiting Approval", "Sessions", "Open Concerns"), """
                            SELECT u.display_name AS "Mentor", u.username AS "Username",
                                   (SELECT count(*) FROM mentor_allocations a WHERE a.faculty_user_id = u.id AND a.status = 'APPROVED') AS "Mentees",
                                   (SELECT count(*) FROM mentor_allocations a WHERE a.faculty_user_id = u.id AND a.status = 'PENDING_ADEAN_APPROVAL') AS "Waiting Approval",
                                   (SELECT count(*) FROM mentoring_sessions s WHERE s.faculty_user_id = u.id) AS "Sessions",
                                   (SELECT count(*) FROM mentoring_concerns c WHERE c.faculty_user_id = u.id AND c.status IN ('SUBMITTED', 'IN_REVIEW')) AS "Open Concerns"
                            FROM users u WHERE u.role = 'FACULTY' AND u.enabled AND u.dept_key = ? ORDER BY u.display_name
                            """, me.deptKey());
            case "HOD_COURSE_MATERIAL_STATUS" -> rows(me, key, "Course material status", "Materials per subject of " + departments.name(me.deptKey()),
                    List.of("Semester", "Subject Code", "Subject Title", "Units Covered", "Materials", "Downloads"), """
                            SELECT j.semester AS "Semester", j.code AS "Subject Code", j.title AS "Subject Title",
                                   count(DISTINCT m.unit_number) AS "Units Covered", count(m.id) AS "Materials",
                                   coalesce(sum(m.download_count), 0) AS "Downloads"
                            FROM subjects j LEFT JOIN course_materials m ON m.dept_key = j.dept_key AND m.semester = j.semester AND m.subject_code = j.code
                            WHERE j.dept_key = ? GROUP BY j.semester, j.code, j.title ORDER BY 1, 2
                            """, me.deptKey());
            case "DEAN_COLLEGE_PERFORMANCE" -> rows(me, key, "College performance", "Published results by department",
                    List.of("Department", "Subjects", "Appeared", "Passed", "Pass %"), """
                            SELECT d.name AS "Department", count(DISTINCT b.id) AS "Subjects", count(r.id) AS "Appeared",
                                   count(r.id) FILTER (WHERE r.passed) AS "Passed",
                                   round(100.0 * count(r.id) FILTER (WHERE r.passed) / nullif(count(r.id), 0), 1) AS "Pass %"
                            FROM departments d LEFT JOIN result_batches b ON b.dept_key = d.dept_key AND b.status = 'PUBLISHED'
                            LEFT JOIN result_records r ON r.batch_id = b.id
                            WHERE d.college_key = ? GROUP BY d.name ORDER BY d.name
                            """, departments.college());
            case "DEAN_MENTORING_COMPLIANCE" -> rows(me, key, "Mentoring compliance", "Mentor allotment and sessions by department",
                    List.of("Department", "Students", "Mentor Approved", "Waiting Approval", "Coverage %", "Sessions"), """
                            SELECT d.name AS "Department", (SELECT count(*) FROM students s WHERE s.dept_key = d.dept_key) AS "Students",
                                   (SELECT count(*) FROM mentor_allocations a WHERE a.dept_key = d.dept_key AND a.status = 'APPROVED') AS "Mentor Approved",
                                   (SELECT count(*) FROM mentor_allocations a WHERE a.dept_key = d.dept_key AND a.status = 'PENDING_ADEAN_APPROVAL') AS "Waiting Approval",
                                   round(100.0 * (SELECT count(*) FROM mentor_allocations a WHERE a.dept_key = d.dept_key AND a.status = 'APPROVED')
                                         / nullif((SELECT count(*) FROM students s WHERE s.dept_key = d.dept_key), 0), 1) AS "Coverage %",
                                   (SELECT count(*) FROM mentoring_sessions m JOIN students s ON s.reg_no = m.reg_no WHERE s.dept_key = d.dept_key) AS "Sessions"
                            FROM departments d WHERE d.college_key = ? ORDER BY d.name
                            """, departments.college());
            case "FACULTY_RESEARCH_SUMMARY", "HOD_RESEARCH_REGISTRY", "DEAN_RESEARCH_MATRIX" ->
                    empty(me, key, "Research", "Research records are not kept in the portal yet.");
            default -> throw ApiException.notFound("Unknown report: " + reportKey);
        };
    }

    @PostMapping("/log-download")
    void log(@RequestBody LogRequest req) {
        CurrentUser me = CurrentUser.get();
        if (req == null || req.reportType() == null || req.fileFormat() == null) throw ApiException.badRequest("Missing report or format");
        db.sql("""
                        INSERT INTO report_downloads (user_id, username, role, report_type, file_format, filters_applied)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """).params(me.id(), me.username(), me.role().name(), clip(req.reportType(), 60),
                        clip(req.fileFormat().toUpperCase(Locale.ROOT), 10), req.filtersApplied() == null ? "" : clip(req.filtersApplied(), 500))
                .update();
    }

    @GetMapping("/history")
    List<LogView> history() {
        CurrentUser me = CurrentUser.get();
        return db.sql("""
                        SELECT id, username, role, report_type, file_format, filters_applied, downloaded_at
                        FROM report_downloads WHERE user_id = ? ORDER BY downloaded_at DESC LIMIT 50
                        """).param(me.id())
                .query((rs, n) -> new LogView(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), rs.getObject(7, OffsetDateTime.class).toString()))
                .list();
    }

    // ---------------------------------------------------------------- building

    private Dataset rows(CurrentUser me, String key, String title, String subtitle, List<String> columns, String sql, Object param) {
        List<Map<String, Object>> raw = db.sql(sql).param(param).query().listOfRows();
        List<Map<String, Object>> rows = new ArrayList<>();
        int i = 0;
        for (Map<String, Object> r : raw) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("S.No", ++i);
            for (String c : columns) row.put(c, r.get(c));
            if (r.containsKey("Attendance %")) {
                long classes = ((Number) r.get("Classes")).longValue();
                long attended = ((Number) r.get("Present")).longValue() + ((Number) r.get("On Duty")).longValue();
                row.put("Attendance %", classes == 0 ? 0 : Math.round(attended * 1000.0 / classes) / 10.0);
            }
            rows.add(row);
        }
        List<String> cols = new ArrayList<>();
        cols.add("S.No");
        cols.addAll(columns);
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("Total records", rows.size());
        summary.put("Scope", scope(me));
        return new Dataset(key, title, subtitle, me.name(), roleLabel(me), OffsetDateTime.now().toString(), cols, rows, summary);
    }

    private Dataset empty(CurrentUser me, String key, String title, String note) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("Total records", 0);
        summary.put("Note", note);
        return new Dataset(key, title, note, me.name(), roleLabel(me), OffsetDateTime.now().toString(), List.of("S.No"), List.of(), summary);
    }

    private String scope(CurrentUser me) {
        return switch (me.role()) {
            case STUDENT -> me.regNo();
            case FACULTY -> me.name();
            case HOD -> departments.name(me.deptKey());
            case DEAN -> departments.college().toUpperCase(Locale.ROOT);
            default -> "";
        };
    }

    private static String roleLabel(CurrentUser me) {
        return switch (me.role()) {
            case DEAN -> "Associate Dean";
            case HOD -> "HOD";
            case FACULTY -> "Faculty";
            case STUDENT -> "Student";
            default -> me.role().name();
        };
    }

    private static String clip(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }
}
