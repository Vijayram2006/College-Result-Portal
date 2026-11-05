package edu.kvell.results.attendance;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Departments;
import edu.kvell.results.erp.ErpSupport;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Attendance. The subject faculty mark each class period (present, absent or on duty). At the end of the month they
 * submit the month's register of the subject; the HOD approves it (or returns it), then the Associate Dean approves it.
 * Students see only the months the Associate Dean approved. Eligibility: at or above attendance.eligible_pct is
 * eligible, at or above attendance.condonation_pct needs condonation, below that is a shortage.
 */
@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    static final Set<String> STATUSES = Set.of("PRESENT", "ABSENT", "ON_DUTY");

    public record SubjectOption(long id, String code, String title, int semester, String deptKey, String faculty) {
    }

    public record RosterItem(String regNo, String name, String deptKey, int semester, String category) {
    }

    public record RecordItem(long id, String regNo, String studentName, String attendanceDate, String sessionSlot,
                             String status, String remark, String markedBy) {
    }

    public record StudentSummary(String regNo, String studentName, int conducted, int attended, int absent, int od,
                                 double percentage, String eligibilityStatus) {
    }

    public record BatchSummary(String batchId, String deptKey, int semester, String subjectCode, String subjectTitle,
                               int month, int year, String facultyName, int totalConducted, int totalStudents,
                               double classAveragePct, String status, String submittedAt, String hodName,
                               String hodActionAt, String adeanName, String adeanActionAt) {
    }

    public record BatchDetail(String batchId, String deptKey, int semester, String subjectCode, String subjectTitle,
                              int month, int year, String facultyName, int totalConducted, int totalStudents,
                              double classAveragePct, String status, String submittedAt, String hodName,
                              String hodActionAt, String hodRemarks, String adeanName, String adeanActionAt,
                              String adeanRemarks, List<StudentSummary> students) {
    }

    public record DailyRow(String regNo, String status, String remark) {
    }

    public record DailyRequest(String deptKey, Integer semester, String subjectCode, String date, String sessionSlot,
                               List<DailyRow> records) {
    }

    public record ReviewRequest(String batchId, String action, String remarks) {
    }

    public record MonthBreakdown(int month, int year, String monthName, int conducted, int attended, int absent, int od,
                                 double percentage) {
    }

    public record SubjectAttendance(String subjectCode, String subjectTitle, String facultyName, int totalConducted,
                                    int totalAttended, int totalAbsent, int totalOd, double percentage,
                                    String eligibilityStatus, List<MonthBreakdown> monthlyBreakdown) {
    }

    public record StudentOverview(String regNo, String studentName, int semester, String deptKey,
                                  double overallPercentage, int totalConducted, int totalAttended, int totalAbsent,
                                  int totalOd, String overallEligibility, List<SubjectAttendance> subjects) {
    }

    public record AbsentItem(long id, String subjectCode, String subjectTitle, String facultyName, String attendanceDate,
                             String dayOfWeek, String sessionSlot, String status, String remark) {
    }

    public record AbsentGroup(String subjectCode, String subjectTitle, String facultyName, int totalAbsentDays,
                              List<AbsentItem> absentDates) {
    }

    public record AbsentDetails(String regNo, String studentName, int totalAbsentCount, int subjectsAffected,
                                List<AbsentGroup> subjectGroups, List<AbsentItem> allAbsents) {
    }

    private final JdbcClient db;
    private final ErpSupport erp;
    private final Departments departments;
    private final NotificationService notifications;

    public AttendanceController(JdbcClient db, ErpSupport erp, Departments departments, NotificationService notifications) {
        this.db = db;
        this.erp = erp;
        this.departments = departments;
        this.notifications = notifications;
    }

    // ---------------------------------------------------------------- faculty

    /** The subjects the signed-in faculty member (or HOD) teaches; the HOD also sees every subject of the department. */
    @GetMapping("/faculty/subjects")
    List<SubjectOption> subjects(@RequestParam(required = false) Integer semester) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        return db.sql("""
                        SELECT coalesce(j.id, 0) AS id, f.subject_code, coalesce(j.title, f.subject_code) AS title, f.semester, f.dept_key
                        FROM faculty_subjects f
                        LEFT JOIN subjects j ON j.dept_key = f.dept_key AND j.semester = f.semester AND j.code = f.subject_code
                        WHERE f.user_id = ? AND (CAST(? AS SMALLINT) IS NULL OR f.semester = ?)
                        UNION
                        SELECT j.id, j.code, j.title, j.semester, j.dept_key FROM subjects j
                        WHERE ? = 'HOD' AND j.dept_key = ? AND (CAST(? AS SMALLINT) IS NULL OR j.semester = ?)
                        ORDER BY 4, 2
                        """)
                .params(me.id(), semester, semester, me.role().name(), me.deptKey(), semester, semester)
                .query((rs, n) -> new SubjectOption(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getInt(4),
                        rs.getString(5), me.name()))
                .list();
    }

    @GetMapping("/faculty/students")
    List<RosterItem> roster(@RequestParam(required = false) String deptKey, @RequestParam(required = false) Integer semester) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        String dept = deptKey == null || deptKey.isBlank() ? me.deptKey() : departments.key(deptKey);
        if (dept == null || semester == null) throw ApiException.badRequest("Choose the department and the semester");
        return db.sql("""
                        SELECT reg_no, name, dept_key, semester, category FROM students
                        WHERE dept_key = ? AND semester = ? ORDER BY reg_no
                        """).params(dept, semester)
                .query((rs, n) -> new RosterItem(rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4),
                        rs.getString(5)))
                .list();
    }

    /** The marks of one class period (empty when it has not been marked yet). */
    @GetMapping("/daily")
    List<RecordItem> daily(@RequestParam String subjectCode, @RequestParam String date,
                           @RequestParam(required = false) String sessionSlot) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        LocalDate d = parseDate(date);
        return db.sql("""
                        SELECT r.id, r.reg_no, s.name, r.attendance_date, r.session_slot, r.status, coalesce(r.remark, ''), r.marked_by
                        FROM attendance_records r JOIN attendance_batches b ON b.batch_id = r.batch_id
                        JOIN students s ON s.reg_no = r.reg_no
                        WHERE b.subject_code = ? AND r.attendance_date = ? AND (CAST(? AS VARCHAR) IS NULL OR r.session_slot = ?)
                          AND (b.faculty_user_id = ? OR (? = 'HOD' AND b.dept_key = ?)
                               OR EXISTS (SELECT 1 FROM faculty_subjects f WHERE f.user_id = ? AND f.dept_key = b.dept_key
                                          AND f.semester = b.semester AND f.subject_code = b.subject_code))
                        ORDER BY r.reg_no
                        """)
                .params(subjectCode, d, sessionSlot, sessionSlot, me.id(), me.role().name(), me.deptKey(), me.id())
                .query((rs, n) -> new RecordItem(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4),
                        rs.getString(5), rs.getString(6), rs.getString(7), rs.getString(8)))
                .list();
    }

    /** Saves (or corrects) the marks of one class period. The month's register must not be submitted yet. */
    @PostMapping("/daily")
    @Transactional
    BatchDetail saveDaily(@RequestBody DailyRequest req) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        if (req == null || req.subjectCode() == null || req.semester() == null || req.date() == null
                || req.sessionSlot() == null || req.sessionSlot().isBlank()) {
            throw ApiException.badRequest("Choose the subject, the date and the period");
        }
        String dept = departments.key(req.deptKey() == null ? me.deptKey() : req.deptKey());
        int sem = req.semester();
        LocalDate d = parseDate(req.date());
        if (d.isAfter(ErpSupport.today())) throw ApiException.badRequest("Attendance cannot be marked for a future date");
        if (d.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) throw ApiException.badRequest("The date is a Sunday");
        requireTeacher(me, dept, sem, req.subjectCode());
        if (req.records() == null || req.records().isEmpty()) throw ApiException.badRequest("No students to mark");

        String batchId = ensureBatch(me, dept, sem, req.subjectCode(), d.getYear(), d.getMonthValue());
        String status = db.sql("SELECT status FROM attendance_batches WHERE batch_id = ?").param(batchId).query(String.class).single();
        if (!editable(status)) {
            throw new ApiException(HttpStatus.CONFLICT, "The register of " + monthName(d.getMonthValue()) + " " + d.getYear()
                    + " is already submitted. It can be changed only if the HOD or the Associate Dean returns it.");
        }
        Set<String> roster = Set.copyOf(db.sql("SELECT reg_no FROM students WHERE dept_key = ? AND semester = ?")
                .params(dept, sem).query(String.class).list());
        String slot = req.sessionSlot().trim();
        db.sql("DELETE FROM attendance_records WHERE batch_id = ? AND attendance_date = ? AND session_slot = ?")
                .params(batchId, d, slot).update();
        for (DailyRow r : req.records()) {
            if (r == null || r.regNo() == null || !roster.contains(r.regNo())) continue;
            String st = r.status() == null ? "PRESENT" : r.status().trim().toUpperCase(Locale.ROOT);
            if (!STATUSES.contains(st)) throw ApiException.badRequest("Unknown attendance status: " + r.status());
            String remark = r.remark() == null || r.remark().isBlank() || "PRESENT".equals(st) ? null : clip(r.remark().trim(), 200);
            db.sql("""
                            INSERT INTO attendance_records (batch_id, reg_no, attendance_date, session_slot, status, remark, marked_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            """).params(batchId, r.regNo(), d, slot, st, remark, me.name()).update();
        }
        return detail(batchId);
    }

    /**
     * The month's register of a subject. When nothing is marked yet it comes back as an empty draft (not saved).
     */
    @GetMapping("/monthly/batch")
    BatchDetail batch(@RequestParam(required = false) String batchId, @RequestParam(required = false) String deptKey,
                      @RequestParam(required = false) Integer semester, @RequestParam(required = false) String subjectCode,
                      @RequestParam(required = false) Integer year, @RequestParam(required = false) Integer month) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        if (batchId == null || batchId.isBlank()) {
            if (subjectCode == null || semester == null || year == null || month == null) {
                throw ApiException.badRequest("Choose the subject and the month");
            }
            String dept = departments.key(deptKey == null ? me.deptKey() : deptKey);
            batchId = batchIdOf(dept, semester, subjectCode, year, month);
            if (!exists(batchId)) {
                if (me.role() != Role.DEAN) requireTeacher(me, dept, semester, subjectCode);
                List<StudentSummary> students = db.sql("SELECT reg_no, name FROM students WHERE dept_key = ? AND semester = ? ORDER BY reg_no")
                        .params(dept, semester)
                        .query((rs, n) -> new StudentSummary(rs.getString(1), rs.getString(2), 0, 0, 0, 0, 0, "SHORTAGE"))
                        .list();
                return new BatchDetail(batchId, dept, semester, subjectCode, subjectTitle(dept, semester, subjectCode), month,
                        year, me.name(), 0, students.size(), 0, "DRAFT", null, null, null, null, null, null, null, students);
            }
        }
        requireViewer(me, batchId);
        return detail(batchId);
    }

    @PostMapping("/monthly/submit")
    @Transactional
    BatchDetail submit(@RequestParam String batchId) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        Map<String, Object> b = batchRow(batchId);
        requireTeacher(me, (String) b.get("dept_key"), ((Number) b.get("semester")).intValue(), (String) b.get("subject_code"));
        if (!editable((String) b.get("status"))) throw new ApiException(HttpStatus.CONFLICT, "This register is already submitted");
        int marked = db.sql("SELECT count(*) FROM attendance_records WHERE batch_id = ?").param(batchId).query(Integer.class).single();
        if (marked == 0) throw ApiException.badRequest("Mark at least one class before submitting the month's register");
        db.sql("""
                        UPDATE attendance_batches SET status = 'SUBMITTED_TO_HOD', submitted_at = now(), faculty_user_id = ?,
                               faculty_name = ?, hod_name = NULL, hod_action_at = NULL, hod_remarks = NULL,
                               adean_name = NULL, adean_action_at = NULL, adean_remarks = NULL
                        WHERE batch_id = ?
                        """).params(me.id(), me.name(), batchId).update();
        String dept = (String) b.get("dept_key");
        notifications.notify(Audience.HOD, dept, null, "Attendance register submitted",
                me.name() + " submitted the attendance of " + b.get("subject_code") + " for "
                        + monthName(((Number) b.get("month")).intValue()) + " " + b.get("year") + ". Open Attendance Approval to review it.",
                "attendance");
        return detail(batchId);
    }

    // ---------------------------------------------------------------- HOD and Associate Dean

    @GetMapping("/hod/batches")
    List<BatchSummary> hodBatches(@RequestParam(required = false) String deptKey, @RequestParam(required = false) String status) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        return summaries("b.dept_key = '" + departments.key(me.deptKey()) + "' AND b.status <> 'DRAFT'", status);
    }

    @PostMapping("/hod/review")
    @Transactional
    BatchDetail hodReview(@RequestBody ReviewRequest req) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        Map<String, Object> b = batchRow(req.batchId());
        if (!me.deptKey().equals(b.get("dept_key"))) throw new ApiException(HttpStatus.FORBIDDEN, "This register is of another department");
        if (!"SUBMITTED_TO_HOD".equals(b.get("status"))) throw new ApiException(HttpStatus.CONFLICT, "This register is not waiting for your review");
        boolean approve = approve(req);
        db.sql("UPDATE attendance_batches SET status = ?, hod_name = ?, hod_action_at = now(), hod_remarks = ? WHERE batch_id = ?")
                .params(approve ? "HOD_APPROVED" : "REJECTED_BY_HOD", me.name(), blankToNull(req.remarks()), req.batchId()).update();
        String what = "attendance of " + b.get("subject_code") + " for " + monthName(((Number) b.get("month")).intValue()) + " " + b.get("year");
        notifyFaculty(b, approve ? "Attendance approved by the HOD" : "Attendance returned by the HOD",
                approve ? "The HOD approved the " + what + " and forwarded it to the Associate Dean."
                        : "The HOD returned the " + what + reason(req) + " Correct it and submit again.");
        if (approve) {
            notifyOfficers((String) b.get("dept_key"), "Attendance register to approve",
                    "The HOD approved the " + what + ". Open Attendance Approval to approve it.");
        }
        return detail(req.batchId());
    }

    @GetMapping("/adean/batches")
    List<BatchSummary> adeanBatches(@RequestParam(required = false) String deptKey, @RequestParam(required = false) String status) {
        ErpSupport.require(Role.DEAN);
        String where = departments.inCollege("b.dept_key") + " AND b.status NOT IN ('DRAFT', 'REJECTED_BY_HOD')";
        if (deptKey != null && !deptKey.isBlank() && !"ALL".equalsIgnoreCase(deptKey)) {
            where += " AND b.dept_key = '" + departments.key(deptKey) + "'";
        }
        return summaries(where, status);
    }

    @PostMapping("/adean/review")
    @Transactional
    BatchDetail adeanReview(@RequestBody ReviewRequest req) {
        CurrentUser me = ErpSupport.require(Role.DEAN);
        Map<String, Object> b = batchRow(req.batchId());
        requireCollege((String) b.get("dept_key"));
        if (!"HOD_APPROVED".equals(b.get("status"))) throw new ApiException(HttpStatus.CONFLICT, "This register is not waiting for your approval");
        boolean approve = approve(req);
        db.sql("UPDATE attendance_batches SET status = ?, adean_name = ?, adean_action_at = now(), adean_remarks = ? WHERE batch_id = ?")
                .params(approve ? "ADEAN_APPROVED" : "REJECTED_BY_ADEAN", me.name(), blankToNull(req.remarks()), req.batchId()).update();
        String what = "attendance of " + b.get("subject_code") + " for " + monthName(((Number) b.get("month")).intValue()) + " " + b.get("year");
        notifyFaculty(b, approve ? "Attendance published" : "Attendance returned by the Associate Dean",
                approve ? "The Associate Dean approved the " + what + ". Students can now see it."
                        : "The Associate Dean returned the " + what + reason(req) + " Correct it and submit again.");
        if (approve) {
            int sem = ((Number) b.get("semester")).intValue();
            notifications.notify(Audience.STUDENT, (String) b.get("dept_key"), sem, "Attendance updated",
                    "Your attendance of " + b.get("subject_code") + " for " + monthName(((Number) b.get("month")).intValue())
                            + " is published. Open Attendance to see it.", "attendance");
        } else {
            notifications.notify(Audience.HOD, (String) b.get("dept_key"), null, "Attendance returned by the Associate Dean",
                    "The Associate Dean returned the " + what + reason(req), "attendance");
        }
        return detail(req.batchId());
    }

    // ---------------------------------------------------------------- students

    /** A student's attendance, subject by subject, from the months the Associate Dean approved. */
    @GetMapping("/student/overview")
    StudentOverview overview(@RequestParam(required = false) String regNo) {
        String reg = studentReg(regNo);
        Map<String, Object> st = db.sql("SELECT name, semester, dept_key FROM students WHERE reg_no = ?").param(reg)
                .query().singleRow();
        int sem = ((Number) st.get("semester")).intValue();
        String dept = (String) st.get("dept_key");
        List<Map<String, Object>> rows = db.sql("""
                        SELECT b.subject_code, b.year, b.month, b.faculty_name,
                               (SELECT count(*) FROM (SELECT DISTINCT attendance_date, session_slot FROM attendance_records x
                                                      WHERE x.batch_id = b.batch_id) c) AS conducted,
                               count(*) FILTER (WHERE r.status = 'PRESENT') AS present,
                               count(*) FILTER (WHERE r.status = 'ABSENT') AS absent,
                               count(*) FILTER (WHERE r.status = 'ON_DUTY') AS od
                        FROM attendance_batches b LEFT JOIN attendance_records r ON r.batch_id = b.batch_id AND r.reg_no = ?
                        WHERE b.dept_key = ? AND b.semester = ? AND b.status = 'ADEAN_APPROVED'
                        GROUP BY b.batch_id, b.subject_code, b.year, b.month, b.faculty_name
                        ORDER BY b.subject_code, b.year, b.month
                        """).params(reg, dept, sem).query().listOfRows();
        Map<String, List<Map<String, Object>>> bySubject = new LinkedHashMap<>();
        for (Map<String, Object> r : rows) bySubject.computeIfAbsent((String) r.get("subject_code"), k -> new ArrayList<>()).add(r);
        List<SubjectAttendance> subjects = new ArrayList<>();
        int tc = 0, ta = 0, tab = 0, tod = 0;
        for (var e : bySubject.entrySet()) {
            int c = 0, a = 0, ab = 0, od = 0;
            String faculty = "";
            List<MonthBreakdown> months = new ArrayList<>();
            for (Map<String, Object> r : e.getValue()) {
                int mc = num(r.get("conducted")), ma = num(r.get("present")), mab = num(r.get("absent")), mod = num(r.get("od"));
                int m = num(r.get("month"));
                months.add(new MonthBreakdown(m, num(r.get("year")), monthName(m), mc, ma, mab, mod, pct(ma + mod, mc)));
                c += mc; a += ma; ab += mab; od += mod;
                faculty = (String) r.get("faculty_name");
            }
            double p = pct(a + od, c);
            subjects.add(new SubjectAttendance(e.getKey(), subjectTitle(dept, sem, e.getKey()), faculty, c, a, ab, od, p,
                    eligibility(p), months));
            tc += c; ta += a; tab += ab; tod += od;
        }
        double overall = pct(ta + tod, tc);
        return new StudentOverview(reg, (String) st.get("name"), sem, dept, overall, tc, ta, tab, tod,
                tc == 0 ? "ELIGIBLE" : eligibility(overall), subjects);
    }

    /** The classes a student missed (approved months only), grouped by subject. */
    @GetMapping("/student/absent-details")
    AbsentDetails absentDetails(@RequestParam(required = false) String regNo, @RequestParam(required = false) String subjectCode) {
        String reg = studentReg(regNo);
        Map<String, Object> st = db.sql("SELECT name, semester, dept_key FROM students WHERE reg_no = ?").param(reg)
                .query().singleRow();
        int sem = ((Number) st.get("semester")).intValue();
        String dept = (String) st.get("dept_key");
        String code = subjectCode == null || subjectCode.isBlank() || "ALL".equalsIgnoreCase(subjectCode) ? null : subjectCode;
        List<AbsentItem> all = db.sql("""
                        SELECT r.id, b.subject_code, b.faculty_name, r.attendance_date, r.session_slot, r.status, coalesce(r.remark, '')
                        FROM attendance_records r JOIN attendance_batches b ON b.batch_id = r.batch_id
                        WHERE r.reg_no = ? AND r.status = 'ABSENT' AND b.status = 'ADEAN_APPROVED'
                          AND (CAST(? AS VARCHAR) IS NULL OR b.subject_code = ?)
                        ORDER BY r.attendance_date DESC, r.session_slot
                        """).params(reg, code, code)
                .query((rs, n) -> {
                    LocalDate d = rs.getDate(4).toLocalDate();
                    return new AbsentItem(rs.getLong(1), rs.getString(2), subjectTitle(dept, sem, rs.getString(2)), rs.getString(3),
                            d.toString(), d.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH), rs.getString(5),
                            rs.getString(6), rs.getString(7));
                }).list();
        Map<String, List<AbsentItem>> groups = new LinkedHashMap<>();
        for (AbsentItem a : all) groups.computeIfAbsent(a.subjectCode(), k -> new ArrayList<>()).add(a);
        List<AbsentGroup> out = new ArrayList<>();
        for (var e : groups.entrySet()) {
            AbsentItem first = e.getValue().get(0);
            out.add(new AbsentGroup(e.getKey(), first.subjectTitle(), first.facultyName(), e.getValue().size(), e.getValue()));
        }
        return new AbsentDetails(reg, (String) st.get("name"), all.size(), out.size(), out, all);
    }

    // ---------------------------------------------------------------- rules

    static String batchIdOf(String dept, int sem, String code, int year, int month) {
        return "ATT-" + dept.toUpperCase(Locale.ROOT) + "-" + sem + "-" + code + "-" + year + "-" + String.format("%02d", month);
    }

    private String ensureBatch(CurrentUser me, String dept, int sem, String code, int year, int month) {
        String id = batchIdOf(dept, sem, code, year, month);
        db.sql("""
                        INSERT INTO attendance_batches (batch_id, dept_key, semester, subject_code, year, month, faculty_user_id, faculty_name)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (batch_id) DO NOTHING
                        """).params(id, dept, sem, code, year, month, me.id(), me.name()).update();
        return id;
    }

    private boolean exists(String batchId) {
        return db.sql("SELECT count(*) FROM attendance_batches WHERE batch_id = ?").param(batchId).query(Integer.class).single() > 0;
    }

    private static boolean editable(String status) {
        return "DRAFT".equals(status) || "REJECTED_BY_HOD".equals(status) || "REJECTED_BY_ADEAN".equals(status);
    }

    private Map<String, Object> batchRow(String batchId) {
        if (batchId == null) throw ApiException.badRequest("No register chosen");
        return db.sql("SELECT * FROM attendance_batches WHERE batch_id = ?").param(batchId).query().listOfRows().stream()
                .findFirst().orElseThrow(() -> ApiException.notFound("Attendance register not found"));
    }

    /** The subject's faculty (faculty_subjects) or the department's HOD. */
    private void requireTeacher(CurrentUser me, String dept, int sem, String code) {
        if (me.role() == Role.HOD && dept.equals(me.deptKey())) return;
        int n = db.sql("SELECT count(*) FROM faculty_subjects WHERE user_id = ? AND dept_key = ? AND semester = ? AND subject_code = ?")
                .params(me.id(), dept, sem, code).query(Integer.class).single();
        if (n == 0) throw new ApiException(HttpStatus.FORBIDDEN, "You are not allotted to teach " + code + " in this class");
    }

    private void requireViewer(CurrentUser me, String batchId) {
        Map<String, Object> b = batchRow(batchId);
        String dept = (String) b.get("dept_key");
        switch (me.role()) {
            case DEAN -> requireCollege(dept);
            case HOD -> {
                if (!dept.equals(me.deptKey())) requireTeacher(me, dept, num(b.get("semester")), (String) b.get("subject_code"));
            }
            default -> requireTeacher(me, dept, num(b.get("semester")), (String) b.get("subject_code"));
        }
    }

    private void requireCollege(String dept) {
        int n = db.sql("SELECT count(*) FROM departments WHERE dept_key = ? AND college_key = ?")
                .params(dept, departments.college()).query(Integer.class).single();
        if (n == 0) throw new ApiException(HttpStatus.FORBIDDEN, "This register is of another college");
    }

    /** The student's own register number, or (for staff) the one asked for, within their reach. */
    private String studentReg(String regNo) {
        CurrentUser me = CurrentUser.get();
        if (me.role() == Role.STUDENT) return me.regNo();
        ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        if (regNo == null || regNo.isBlank()) throw ApiException.badRequest("Choose a student");
        String dept = db.sql("SELECT dept_key FROM students WHERE reg_no = ?").param(regNo).query(String.class).optional()
                .orElseThrow(() -> ApiException.notFound("Student not found"));
        if (me.role() == Role.HOD && !dept.equals(me.deptKey())) throw new ApiException(HttpStatus.FORBIDDEN, "This student is of another department");
        if (me.role() == Role.DEAN) requireCollege(dept);
        return regNo;
    }

    private List<BatchSummary> summaries(String where, String status) {
        String st = status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) ? null : status.toUpperCase(Locale.ROOT);
        List<String> ids = db.sql("SELECT b.batch_id FROM attendance_batches b WHERE " + where
                        + " AND (CAST(? AS VARCHAR) IS NULL OR b.status = ?) ORDER BY b.year DESC, b.month DESC, b.submitted_at DESC NULLS LAST")
                .params(st, st).query(String.class).list();
        List<BatchSummary> out = new ArrayList<>();
        for (String id : ids) {
            BatchDetail d = detail(id);
            out.add(new BatchSummary(d.batchId(), d.deptKey(), d.semester(), d.subjectCode(), d.subjectTitle(), d.month(), d.year(),
                    d.facultyName(), d.totalConducted(), d.totalStudents(), d.classAveragePct(), d.status(), d.submittedAt(),
                    d.hodName(), d.hodActionAt(), d.adeanName(), d.adeanActionAt()));
        }
        return out;
    }

    BatchDetail detail(String batchId) {
        Map<String, Object> b = batchRow(batchId);
        String dept = (String) b.get("dept_key");
        int sem = num(b.get("semester"));
        String code = (String) b.get("subject_code");
        int conducted = db.sql("SELECT count(*) FROM (SELECT DISTINCT attendance_date, session_slot FROM attendance_records WHERE batch_id = ?) c")
                .param(batchId).query(Integer.class).single();
        List<StudentSummary> students = db.sql("""
                        SELECT s.reg_no, s.name,
                               count(r.id) FILTER (WHERE r.status = 'PRESENT') AS present,
                               count(r.id) FILTER (WHERE r.status = 'ABSENT') AS absent,
                               count(r.id) FILTER (WHERE r.status = 'ON_DUTY') AS od
                        FROM students s LEFT JOIN attendance_records r ON r.reg_no = s.reg_no AND r.batch_id = ?
                        WHERE s.dept_key = ? AND s.semester = ?
                        GROUP BY s.reg_no, s.name ORDER BY s.reg_no
                        """).params(batchId, dept, sem)
                .query((rs, n) -> {
                    int a = rs.getInt(3), ab = rs.getInt(4), od = rs.getInt(5);
                    double p = pct(a + od, conducted);
                    return new StudentSummary(rs.getString(1), rs.getString(2), conducted, a, ab, od, p, eligibility(p));
                }).list();
        double avg = students.isEmpty() || conducted == 0 ? 0
                : Math.round(students.stream().mapToDouble(StudentSummary::percentage).average().orElse(0) * 10) / 10.0;
        return new BatchDetail(batchId, dept, sem, code, subjectTitle(dept, sem, code), num(b.get("month")), num(b.get("year")),
                (String) b.get("faculty_name"), conducted, students.size(), avg, (String) b.get("status"),
                time(b.get("submitted_at")), (String) b.get("hod_name"), time(b.get("hod_action_at")), (String) b.get("hod_remarks"),
                (String) b.get("adean_name"), time(b.get("adean_action_at")), (String) b.get("adean_remarks"), students);
    }

    private String subjectTitle(String dept, int sem, String code) {
        return db.sql("SELECT title FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?").params(dept, sem, code)
                .query(String.class).optional().orElse(code);
    }

    private String eligibility(double pct) {
        if (pct >= erp.intSetting("attendance.eligible_pct", 75)) return "ELIGIBLE";
        if (pct >= erp.intSetting("attendance.condonation_pct", 65)) return "CONDONATION";
        return "SHORTAGE";
    }

    private void notifyFaculty(Map<String, Object> b, String title, String message) {
        Object id = b.get("faculty_user_id");
        if (id != null) notifications.notifyUser(((Number) id).longValue(), Audience.FACULTY, (String) b.get("dept_key"), null, title, message, "attendance");
    }

    private void notifyOfficers(String dept, String title, String message) {
        List<Long> ids = db.sql("""
                        SELECT u.id FROM users u JOIN departments d ON d.college_key = u.college_key
                        WHERE d.dept_key = ? AND u.role = 'DEAN' AND u.enabled AND coalesce(u.officer_title, 'ASSOCIATE_DEAN') = 'ASSOCIATE_DEAN'
                        """).param(dept).query(Long.class).list();
        for (Long id : ids) notifications.notifyUser(id, Audience.DEAN, dept, null, title, message, "attendance-approval");
    }

    private static boolean approve(ReviewRequest req) {
        if (req == null || req.action() == null) throw ApiException.badRequest("Approve or reject");
        boolean approve = "APPROVE".equalsIgnoreCase(req.action());
        if (!approve && !"REJECT".equalsIgnoreCase(req.action())) throw ApiException.badRequest("Approve or reject");
        if (!approve && (req.remarks() == null || req.remarks().isBlank())) throw ApiException.badRequest("Give the reason for returning it");
        return approve;
    }

    private static String reason(ReviewRequest req) {
        return req.remarks() == null || req.remarks().isBlank() ? "." : ": " + req.remarks().trim() + ".";
    }

    private static double pct(int part, int whole) {
        return whole == 0 ? 0 : Math.round(part * 1000.0 / whole) / 10.0;
    }

    private static int num(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }

    private static String monthName(int m) {
        return java.time.Month.of(m).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
    }

    private static String time(Object o) {
        if (o == null) return null;
        if (o instanceof OffsetDateTime t) return ErpSupport.display(t);
        if (o instanceof java.sql.Timestamp t) return ErpSupport.display(t.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return o.toString();
    }

    private static LocalDate parseDate(String s) {
        try {
            return LocalDate.parse(s.trim());
        } catch (Exception e) {
            throw ApiException.badRequest("Invalid date: " + s);
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : clip(s.trim(), 500);
    }

    private static String clip(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }
}
