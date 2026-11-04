package edu.kvell.results.erp;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Semesters;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Class in-charge: an assignment on top of the FACULTY role. The HOD assigns one in-charge per class (department,
 * semester, section) and can set a temporary in-charge while the regular one is on leave; a change closes the old row
 * (to_date) so the history stays. A faculty member sees "My Class" only while they are an in-charge.
 */
@RestController
@RequestMapping("/api/erp/classes")
public class ClassInchargeController {

    public record ClassRow(int semester, String section, int students, Long inchargeId, String inchargeName,
                           Long temporaryId, String temporaryName, String temporaryTo) {
    }

    public record Faculty(long id, String username, String name) {
    }

    public record AssignRequest(String semester, String section, Long facultyUserId, String fromDate, String toDate) {
    }

    public record SectionRequest(List<String> regNos, String section) {
    }

    public record Student(String regNo, String name, String section, boolean onLeaveToday) {
    }

    public record MyClass(String deptKey, String deptName, int semester, String semesterLabel, String section,
                          boolean temporary, List<Student> students, int pendingLeaves) {
    }

    private final JdbcClient db;
    private final ErpSupport erp;
    private final NotificationService notifications;
    private final AuditService audit;

    public ClassInchargeController(JdbcClient db, ErpSupport erp, NotificationService notifications, AuditService audit) {
        this.db = db;
        this.erp = erp;
        this.notifications = notifications;
        this.audit = audit;
    }

    /** HOD: the department's classes with their in-charges. */
    @GetMapping
    List<ClassRow> classes() {
        CurrentUser hod = ErpSupport.require(Role.HOD);
        return db.sql("""
                        SELECT s.semester, s.section, count(*) AS students,
                               r.faculty_user_id AS rid, ru.display_name AS rname,
                               t.faculty_user_id AS tid, tu.display_name AS tname, t.to_date AS tto
                        FROM students s
                        LEFT JOIN class_incharge r ON r.dept_key = s.dept_key AND r.semester = s.semester
                             AND r.section = s.section AND r.to_date IS NULL AND NOT r.temporary
                        LEFT JOIN users ru ON ru.id = r.faculty_user_id
                        LEFT JOIN LATERAL (SELECT * FROM class_incharge x WHERE x.dept_key = s.dept_key
                             AND x.semester = s.semester AND x.section = s.section AND x.temporary
                             AND x.from_date <= current_date AND x.to_date >= current_date
                             ORDER BY x.from_date DESC LIMIT 1) t ON TRUE
                        LEFT JOIN users tu ON tu.id = t.faculty_user_id
                        WHERE s.dept_key = ?
                        GROUP BY s.semester, s.section, r.faculty_user_id, ru.display_name, t.faculty_user_id,
                                 tu.display_name, t.to_date
                        ORDER BY s.semester, s.section
                        """).param(hod.deptKey())
                .query((rs, n) -> new ClassRow(rs.getInt("semester"), rs.getString("section"), rs.getInt("students"),
                        (Long) rs.getObject("rid"), rs.getString("rname"), (Long) rs.getObject("tid"),
                        rs.getString("tname"), rs.getString("tto")))
                .list();
    }

    /** HOD: the department's faculty, to choose an in-charge from. */
    @GetMapping("/faculty")
    List<Faculty> faculty() {
        CurrentUser hod = ErpSupport.require(Role.HOD);
        return db.sql("""
                        SELECT id, username, display_name FROM users
                        WHERE role = 'FACULTY' AND enabled AND dept_key = ? ORDER BY display_name
                        """).param(hod.deptKey())
                .query((rs, n) -> new Faculty(rs.getLong(1), rs.getString(2), rs.getString(3))).list();
    }

    /** HOD: makes a faculty member the regular in-charge of a class (the previous one's row is closed). */
    @PutMapping("/incharge")
    @Transactional
    Map<String, String> assign(@RequestBody AssignRequest req, HttpServletRequest http) {
        CurrentUser hod = ErpSupport.require(Role.HOD);
        int sem = Semesters.parse(req.semester());
        String section = section(req.section());
        String name = facultyName(req.facultyUserId(), hod.deptKey());
        db.sql("""
                        UPDATE class_incharge SET to_date = GREATEST(from_date, current_date - 1)
                        WHERE dept_key = ? AND semester = ? AND section = ? AND to_date IS NULL AND NOT temporary
                        """).params(hod.deptKey(), sem, section).update();
        db.sql("""
                        INSERT INTO class_incharge (faculty_user_id, dept_key, semester, section, academic_year, assigned_by)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """).params(req.facultyUserId(), hod.deptKey(), sem, section, ErpSupport.academicYear(), hod.name())
                .update();
        String cls = hod.deptKey().toUpperCase(Locale.ROOT) + " " + Semesters.label(sem) + " section " + section;
        notifications.notifyUser(req.facultyUserId(), Audience.FACULTY, hod.deptKey(), null, "You are class in-charge: " + cls,
                "The HOD made you the class in-charge of " + cls + ". Open My Class to see its students, leave requests and subject completion.",
                "my-class");
        audit.record(hod.username(), hod.name(), "ASSIGNED_CLASS_INCHARGE", cls, name + " is the class in-charge of " + cls + ".",
                http.getRemoteAddr());
        return Map.of("status", "assigned");
    }

    /** HOD: a temporary in-charge for some days (leave approvals go to them during those days). */
    @PostMapping("/temporary")
    @Transactional
    Map<String, String> temporary(@RequestBody AssignRequest req, HttpServletRequest http) {
        CurrentUser hod = ErpSupport.require(Role.HOD);
        int sem = Semesters.parse(req.semester());
        String section = section(req.section());
        String name = facultyName(req.facultyUserId(), hod.deptKey());
        LocalDate from = date(req.fromDate(), "From date");
        LocalDate to = date(req.toDate(), "To date");
        if (to.isBefore(from)) throw ApiException.badRequest("To date is before the from date");
        db.sql("""
                        INSERT INTO class_incharge (faculty_user_id, dept_key, semester, section, academic_year,
                                                    from_date, to_date, temporary, assigned_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)
                        """).params(req.facultyUserId(), hod.deptKey(), sem, section, ErpSupport.academicYear(), from, to,
                        hod.name()).update();
        String cls = hod.deptKey().toUpperCase(Locale.ROOT) + " " + Semesters.label(sem) + " section " + section;
        notifications.notifyUser(req.facultyUserId(), Audience.FACULTY, hod.deptKey(), null, "Temporary class in-charge: " + cls,
                "The HOD made you the temporary class in-charge of " + cls + " from " + from + " to " + to + ".", "my-class");
        audit.record(hod.username(), hod.name(), "ASSIGNED_TEMPORARY_INCHARGE", cls,
                name + " is the temporary in-charge of " + cls + " from " + from + " to " + to + ".", http.getRemoteAddr());
        return Map.of("status", "assigned");
    }

    public record SubjectFacultyRequest(String semester, String subject, List<Long> facultyUserIds) {
    }

    /**
     * HOD: allots a subject of the department to its faculty (replacing the subject's earlier faculty). The faculty
     * then see it in their logbook, mark entry and CO sheet, and the subject completion shows who handles it.
     */
    @PutMapping("/subject-faculty")
    @Transactional
    Map<String, Integer> subjectFaculty(@RequestBody SubjectFacultyRequest req, HttpServletRequest http) {
        CurrentUser hod = ErpSupport.require(Role.HOD);
        if (req == null) throw ApiException.badRequest("Choose the subject");
        int sem = Semesters.parse(req.semester());
        String code = req.subject() == null ? "" : req.subject().trim().toUpperCase(Locale.ROOT);
        String title = db.sql("SELECT title FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?")
                .params(hod.deptKey(), sem, code).query(String.class).optional()
                .orElseThrow(() -> ApiException.badRequest(code + " is not a " + Semesters.label(sem) + " subject of your department"));
        List<Long> ids = req.facultyUserIds() == null ? List.of()
                : req.facultyUserIds().stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.size() > 10) throw ApiException.badRequest("At most 10 faculty per subject");
        List<String> names = new java.util.ArrayList<>();
        for (Long id : ids) names.add(facultyName(id, hod.deptKey()));
        List<Long> before = db.sql("SELECT user_id FROM faculty_subjects WHERE dept_key = ? AND semester = ? AND subject_code = ?")
                .params(hod.deptKey(), sem, code).query(Long.class).list();
        db.sql("DELETE FROM faculty_subjects WHERE dept_key = ? AND semester = ? AND subject_code = ?")
                .params(hod.deptKey(), sem, code).update();
        for (Long id : ids) {
            db.sql("INSERT INTO faculty_subjects (user_id, dept_key, semester, subject_code) VALUES (?, ?, ?, ?)")
                    .params(id, hod.deptKey(), sem, code).update();
            if (!before.contains(id)) {
                notifications.notifyUser(id, Audience.FACULTY, hod.deptKey(), null, "Subject allotted: " + code,
                        "The HOD allotted you " + code + " " + title + " (" + Semesters.label(sem)
                                + "). It is now in your logbook, mark entry and CO sheet.", "logbook");
            }
        }
        audit.record(hod.username(), hod.name(), "ALLOTTED_SUBJECT_FACULTY", hod.deptKey().toUpperCase(Locale.ROOT) + " " + code,
                code + " " + title + " (" + Semesters.label(sem) + ") is handled by "
                        + (names.isEmpty() ? "no one" : String.join(", ", names)) + ".", http.getRemoteAddr());
        return Map.of("faculty", ids.size());
    }

    /** HOD: puts students of the department into a section. */
    @PutMapping("/sections")
    Map<String, Integer> sections(@RequestBody SectionRequest req, HttpServletRequest http) {
        CurrentUser hod = ErpSupport.require(Role.HOD);
        String section = section(req.section());
        if (req.regNos() == null || req.regNos().isEmpty()) throw ApiException.badRequest("Choose the students");
        int n = 0;
        for (String reg : req.regNos()) {
            n += db.sql("UPDATE students SET section = ?, updated_at = now() WHERE reg_no = ? AND dept_key = ?")
                    .params(section, reg, hod.deptKey()).update();
        }
        audit.record(hod.username(), hod.name(), "SET_SECTION", hod.deptKey().toUpperCase(Locale.ROOT),
                "Moved " + n + " students to section " + section + ".", http.getRemoteAddr());
        return Map.of("updated", n);
    }

    /** Faculty: the classes they are in-charge of today (empty = no "My Class" section). */
    @GetMapping("/mine")
    List<MyClass> mine() {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        List<Map<String, Object>> rows = db.sql("""
                        SELECT DISTINCT c.dept_key, d.name, c.semester, c.section, c.temporary FROM class_incharge c
                        JOIN departments d ON d.dept_key = c.dept_key
                        WHERE c.faculty_user_id = ? AND c.from_date <= current_date
                          AND (c.to_date IS NULL OR c.to_date >= current_date)
                        ORDER BY c.semester, c.section
                        """).param(me.id()).query().listOfRows();
        return rows.stream()
                .filter(r -> erp.isIncharge(me.id(), (String) r.get("dept_key"), ((Number) r.get("semester")).intValue(),
                        (String) r.get("section")))
                .map(r -> {
                    String dept = (String) r.get("dept_key");
                    int sem = ((Number) r.get("semester")).intValue();
                    String section = (String) r.get("section");
                    List<Student> students = db.sql("""
                                    SELECT s.reg_no, s.name, s.section,
                                           EXISTS (SELECT 1 FROM leave_requests l WHERE l.reg_no = s.reg_no
                                                   AND l.status = 'APPROVED' AND current_date BETWEEN l.from_date AND l.to_date) AS on_leave
                                    FROM students s WHERE s.dept_key = ? AND s.semester = ? AND s.section = ?
                                    ORDER BY s.reg_no
                                    """).params(dept, sem, section)
                            .query((rs, n) -> new Student(rs.getString(1), rs.getString(2), rs.getString(3),
                                    rs.getBoolean(4))).list();
                    int pending = db.sql("""
                                    SELECT count(*) FROM leave_requests l JOIN students s ON s.reg_no = l.reg_no
                                    WHERE l.status = 'PENDING' AND l.approver_role = 'CLASS_INCHARGE'
                                      AND s.dept_key = ? AND s.semester = ? AND s.section = ?
                                    """).params(dept, sem, section).query(Integer.class).single();
                    return new MyClass(dept, (String) r.get("name"), sem, Semesters.label(sem), section,
                            (Boolean) r.get("temporary"), students, pending);
                })
                .toList();
    }

    private String facultyName(Long userId, String dept) {
        if (userId == null) throw ApiException.badRequest("Choose the faculty member");
        return db.sql("SELECT display_name FROM users WHERE id = ? AND role = 'FACULTY' AND enabled AND dept_key = ?")
                .params(userId, dept).query(String.class).optional()
                .orElseThrow(() -> ApiException.badRequest("Choose a faculty member of your department"));
    }

    static String section(String s) {
        String v = s == null ? "" : s.trim().toUpperCase(Locale.ROOT);
        if (!v.matches("[A-Z0-9]{1,5}")) throw ApiException.badRequest("Section: 1 to 5 letters or digits (e.g. A)");
        return v;
    }

    static LocalDate date(String v, String field) {
        try {
            return LocalDate.parse(v == null ? "" : v.trim());
        } catch (Exception e) {
            throw ApiException.badRequest(field + " must be a date (yyyy-mm-dd)");
        }
    }
}
