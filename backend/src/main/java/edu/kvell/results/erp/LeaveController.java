package edu.kvell.results.erp;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Leave approval. The approver follows from the applicant's role: student → their class in-charge (whoever is in-charge
 * today, so a temporary in-charge approves while the regular one is away). Staff leave goes through two steps:
 * faculty → HOD (recommends and forwards) → Associate Dean (approves); HOD → Associate Dean (recommends and forwards)
 * → Dean (approves). A rejection at any step ends the request. An hourly permission (PERM) is decided in one step by
 * the first approver. Staff leave types with a yearly limit use leave_balances; an approved faculty leave gets a
 * substitute suggested for each of their subjects on each leave day.
 */
@RestController
@RequestMapping("/api/erp/leave")
public class LeaveController {

    static final int MAX_ATTACHMENT = 2 * 1024 * 1024;
    static final Set<String> ATTACHMENT_TYPES = Set.of("application/pdf", "image/jpeg", "image/png");

    public record LeaveType(String code, String name, BigDecimal yearlyDays, boolean needsAttachment, BigDecimal used,
                            BigDecimal remaining) {
    }

    public record ApplyRequest(String leaveCode, String fromDate, String toDate, String halfDay, String reason,
                               String attachmentName, String attachmentType, String attachmentBase64, String fromTime,
                               String toTime) {
    }

    public record DecideRequest(Boolean approve, String remarks) {
    }

    public record Substitution(String date, String subjectCode, String substitute) {
    }

    public record Leave(long id, String applicant, String applicantRole, String regNo, String deptKey, String leaveCode,
                        String leaveName, String fromDate, String toDate, String halfDay, BigDecimal days, String reason,
                        boolean hasAttachment, String approverRole, String status, String decidedBy, String decidedAt,
                        String decisionRemarks, String createdAt, List<Substitution> substitutions, String fromTime,
                        String toTime, BigDecimal hours, String forwardedBy, String forwardedRole, String forwardedAt,
                        String forwardRemarks) {
    }

    public record Step(String action, String actor, String remarks, String at) {
    }

    /** What the official leave form prints. */
    public record Form(Leave leave, String applicantName, String username, String designation, String deptName,
                       String collegeName, BigDecimal allowed, BigDecimal usedThisYear, List<Step> steps) {
    }

    static final String PERMISSION = "PERM";

    private final JdbcClient db;
    private final ErpSupport erp;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Departments departments;

    public LeaveController(JdbcClient db, ErpSupport erp, NotificationService notifications, AuditService audit,
                           Departments departments) {
        this.db = db;
        this.erp = erp;
        this.notifications = notifications;
        this.audit = audit;
        this.departments = departments;
    }

    /** The leave types the signed-in user may apply for, with their balance (staff). */
    @GetMapping("/types")
    List<LeaveType> types() {
        CurrentUser me = ErpSupport.require(Role.STUDENT, Role.FACULTY, Role.HOD);
        boolean student = me.role() == Role.STUDENT;
        String year = ErpSupport.academicYear();
        return db.sql("""
                        SELECT t.code, t.name, t.yearly_days, t.needs_attachment,
                               coalesce((SELECT sum(r.days) FROM leave_requests r WHERE r.applicant_id = :uid
                                         AND r.leave_code = t.code AND r.academic_year = :year
                                         AND r.status IN ('APPROVED', 'PENDING')), 0) AS used
                        FROM leave_types t
                        WHERE t.active AND t.applies_to IN ('BOTH', :who)
                        ORDER BY t.code
                        """).param("uid", me.id()).param("year", year).param("who", student ? "STUDENT" : "STAFF")
                .query((rs, n) -> {
                    String code = rs.getString("code");
                    if (PERMISSION.equals(code)) {
                        // Permissions are counted per month (yearlyDays carries the monthly limit)
                        BigDecimal perMonth = BigDecimal.valueOf(erp.intSetting("leave.permission_per_month", 2));
                        BigDecimal used = BigDecimal.valueOf(permissionsInMonth(me.id(), ErpSupport.today()));
                        return new LeaveType(code, rs.getString("name"), perMonth, false, used, perMonth.subtract(used).max(BigDecimal.ZERO));
                    }
                    BigDecimal limit = rs.getBigDecimal("yearly_days");
                    BigDecimal used = rs.getBigDecimal("used");
                    return new LeaveType(code, rs.getString("name"), limit, rs.getBoolean("needs_attachment"),
                            used, limit == null || student ? null : limit.subtract(used).max(BigDecimal.ZERO));
                })
                .list();
    }

    private int permissionsInMonth(long userId, LocalDate day) {
        LocalDate first = day.withDayOfMonth(1);
        return db.sql("""
                        SELECT count(*) FROM leave_requests WHERE applicant_id = ? AND leave_code = 'PERM'
                          AND status IN ('APPROVED', 'PENDING') AND from_date BETWEEN ? AND ?
                        """).params(userId, first, first.plusMonths(1).minusDays(1)).query(Integer.class).single();
    }

    @PostMapping
    @Transactional
    Leave apply(@RequestBody ApplyRequest req, HttpServletRequest http) {
        CurrentUser me = ErpSupport.require(Role.STUDENT, Role.FACULTY, Role.HOD);
        if (req == null) throw ApiException.badRequest("Leave details are required");
        boolean student = me.role() == Role.STUDENT;
        String code = req.leaveCode() == null ? "" : req.leaveCode().trim().toUpperCase(Locale.ROOT);
        Map<String, Object> type = db.sql("SELECT * FROM leave_types WHERE code = ? AND active AND applies_to IN ('BOTH', ?)")
                .params(code, student ? "STUDENT" : "STAFF").query().listOfRows().stream().findFirst()
                .orElseThrow(() -> ApiException.badRequest("Choose a leave type"));
        LocalDate from = ClassInchargeController.date(req.fromDate(), "From date");
        LocalDate to = ClassInchargeController.date(req.toDate(), "To date");
        if (to.isBefore(from)) throw ApiException.badRequest("To date is before the from date");
        if (from.isBefore(ErpSupport.today().minusDays(30))) throw ApiException.badRequest("From date is too far in the past");
        boolean permission = PERMISSION.equals(code);
        String half = req.halfDay() == null || req.halfDay().isBlank() ? null : req.halfDay().trim().toUpperCase(Locale.ROOT);
        if (half != null && !half.equals("FN") && !half.equals("AN")) throw ApiException.badRequest("Half day: FN or AN");
        if (half != null && !from.equals(to)) throw ApiException.badRequest("A half-day leave is for one date");
        java.time.LocalTime fromTime = null;
        java.time.LocalTime toTime = null;
        BigDecimal hours = null;
        BigDecimal days;
        if (permission) {
            if (!from.equals(to)) throw ApiException.badRequest("A permission is for one date");
            if (half != null) throw ApiException.badRequest("A permission is in hours, not a half day");
            if (from.getDayOfWeek() == DayOfWeek.SUNDAY) throw ApiException.badRequest("The date is a Sunday");
            fromTime = time(req.fromTime(), "From time");
            toTime = time(req.toTime(), "To time");
            if (!toTime.isAfter(fromTime)) throw ApiException.badRequest("The to time is before the from time");
            long minutes = java.time.Duration.between(fromTime, toTime).toMinutes();
            int maxHours = erp.intSetting("leave.permission_max_hours", 2);
            if (minutes > maxHours * 60L) throw ApiException.badRequest("A permission is at most " + maxHours + " hours");
            hours = BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 1, java.math.RoundingMode.HALF_UP);
            int perMonth = erp.intSetting("leave.permission_per_month", 2);
            if (permissionsInMonth(me.id(), from) >= perMonth) {
                throw ApiException.badRequest("You have used all " + perMonth + " permissions of this month");
            }
            days = BigDecimal.ZERO;
        } else {
            days = half != null ? new BigDecimal("0.5") : BigDecimal.valueOf(workingDays(from, to));
            if (days.signum() == 0) throw ApiException.badRequest("The dates are all Sundays");
        }
        String reason = req.reason() == null ? "" : req.reason().trim();
        if (reason.length() < 5 || reason.length() > 500) throw ApiException.badRequest("Reason: 5 to 500 characters");

        byte[] file = null;
        if (req.attachmentBase64() != null && !req.attachmentBase64().isBlank()) {
            if (!ATTACHMENT_TYPES.contains(req.attachmentType())) throw ApiException.badRequest("Attachment: PDF, JPEG or PNG");
            try {
                file = Base64.getDecoder().decode(req.attachmentBase64());
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("The attachment could not be read");
            }
            if (file.length > MAX_ATTACHMENT) throw ApiException.badRequest("Attachment: at most 2 MB");
        } else if ((Boolean) type.get("needs_attachment")) {
            throw ApiException.badRequest(type.get("name") + " needs an attachment (e.g. a medical certificate)");
        }
        int overlap = db.sql("""
                        SELECT count(*) FROM leave_requests WHERE applicant_id = ? AND status IN ('PENDING', 'APPROVED')
                          AND from_date <= ? AND to_date >= ?
                        """).params(me.id(), to, from).query(Integer.class).single();
        if (overlap > 0) throw ApiException.conflict("You already have a leave request for these dates");

        String year = ErpSupport.academicYear(from);
        BigDecimal limit = (BigDecimal) type.get("yearly_days");
        if (!student && limit != null) {
            BigDecimal used = db.sql("""
                            SELECT coalesce(sum(days), 0) FROM leave_requests WHERE applicant_id = ? AND leave_code = ?
                              AND academic_year = ? AND status IN ('PENDING', 'APPROVED')
                            """).params(me.id(), code, year).query(BigDecimal.class).single();
            if (used.add(days).compareTo(limit) > 0) {
                throw ApiException.badRequest("Not enough " + type.get("name") + " left: " + limit.subtract(used).max(BigDecimal.ZERO)
                        + " of " + limit + " days");
            }
        }

        String approver;
        String deptKey = me.deptKey();
        Long inchargeId = null;
        if (student) {
            ErpSupport.ClassKey c = erp.classOf(me.regNo());
            deptKey = c.deptKey();
            inchargeId = erp.currentIncharge(c.deptKey(), c.semester(), c.section()).orElseThrow(() -> ApiException.conflict(
                    "Your class has no class in-charge yet. Please ask your HOD."));
            approver = "CLASS_INCHARGE";
        } else {
            approver = me.role() == Role.FACULTY ? "HOD" : "ASSOCIATE_DEAN";
        }
        long id = db.sql("""
                        INSERT INTO leave_requests (applicant_id, applicant_role, dept_key, reg_no, leave_code, from_date, to_date,
                            half_day, days, reason, attachment, attachment_name, attachment_type, academic_year, approver_role,
                            from_time, to_time, hours)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                        """).params(me.id(), me.role().name(), deptKey, student ? me.regNo() : null, code, from, to, half, days,
                        reason, file, file == null ? null : clip(req.attachmentName(), 160),
                        file == null ? null : req.attachmentType(), year, approver, fromTime, toTime, hours)
                .query(Long.class).single();
        action(id, "APPLIED", me.name(), reason);
        String what = me.name() + " applied for " + type.get("name") + " (" + (permission
                ? hours.stripTrailingZeros().toPlainString() + " h on " + from + ", " + fromTime + " to " + toTime
                : days + " day" + (days.compareTo(BigDecimal.ONE) == 0 ? "" : "s") + ", " + from + (from.equals(to) ? "" : " to " + to)) + ").";
        switch (approver) {
            case "CLASS_INCHARGE" -> notifications.notifyUser(inchargeId, Audience.FACULTY,
                    db.sql("SELECT dept_key FROM users WHERE id = ?").param(inchargeId).query(String.class).single(), null,
                    "Student leave request: " + me.regNo(), what + " Approve or reject it in My Class.", "my-class");
            case "HOD" -> notifications.notify(Audience.HOD, deptKey, null, "Faculty leave request", what
                    + (permission ? " Open Leave to decide." : " Open Leave to recommend it to the Associate Dean or reject it."), "leave");
            default -> notifyOfficers("ASSOCIATE_DEAN", deptKey, "HOD leave request", what
                    + (permission ? " Open Leave to decide." : " Open Leave to recommend it to the Dean or reject it."));
        }
        return get(id);
    }

    /** Notifies the Associate Dean(s) or Dean(s) of the department's college. */
    private void notifyOfficers(String title, String deptKey, String subject, String message) {
        List<Long> ids = db.sql("""
                        SELECT u.id FROM users u JOIN departments d ON d.college_key = u.college_key
                        WHERE d.dept_key = ? AND u.role = 'DEAN' AND u.enabled AND coalesce(u.officer_title, 'ASSOCIATE_DEAN') = ?
                        """).params(deptKey, title).query(Long.class).list();
        for (Long id : ids) notifications.notifyUser(id, Audience.DEAN, deptKey, null, subject, message, "leave");
    }

    /** The step of the chain the signed-in user decides: CLASS_INCHARGE, HOD, ASSOCIATE_DEAN or DEAN. */
    String stageOf(CurrentUser me) {
        return switch (me.role()) {
            case HOD -> "HOD";
            case DEAN -> "DEAN".equals(db.sql("SELECT officer_title FROM users WHERE id = ?").param(me.id())
                    .query(String.class).optional().orElse(null)) ? "DEAN" : "ASSOCIATE_DEAN";
            default -> "CLASS_INCHARGE";
        };
    }

    static String label(String stage) {
        return switch (stage) {
            case "CLASS_INCHARGE" -> "class in-charge";
            case "ASSOCIATE_DEAN" -> "Associate Dean";
            case "DEAN" -> "Dean";
            default -> stage;
        };
    }

    static java.time.LocalTime time(String v, String what) {
        try {
            return java.time.LocalTime.parse(v == null ? "" : v.trim());
        } catch (java.time.format.DateTimeParseException e) {
            throw ApiException.badRequest(what + ": choose a time");
        }
    }

    @GetMapping("/mine")
    List<Leave> mine() {
        CurrentUser me = ErpSupport.require(Role.STUDENT, Role.FACULTY, Role.HOD);
        return list("r.applicant_id = :uid", Map.of("uid", me.id()));
    }

    @PostMapping("/{id}/cancel")
    Leave cancel(@PathVariable long id) {
        CurrentUser me = ErpSupport.require(Role.STUDENT, Role.FACULTY, Role.HOD);
        int n = db.sql("UPDATE leave_requests SET status = 'CANCELLED' WHERE id = ? AND applicant_id = ? AND status = 'PENDING'")
                .params(id, me.id()).update();
        if (n == 0) throw ApiException.conflict("Only your own pending requests can be cancelled");
        action(id, "CANCELLED", me.name(), null);
        return get(id);
    }

    /** The requests the signed-in user decides: pending first, then the last decided ones. */
    @GetMapping("/inbox")
    List<Leave> inbox() {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        String stage = stageOf(me);
        List<Leave> all = switch (me.role()) {
            // The HOD's step: every faculty request of the department (also the ones already forwarded)
            case HOD -> list("r.applicant_role = 'FACULTY' AND r.dept_key = :dept", Map.of("dept", me.deptKey()));
            // Associate Dean: faculty requests the HOD forwarded, and the HODs' own requests
            case DEAN -> "ASSOCIATE_DEAN".equals(stage)
                    ? list("((r.applicant_role = 'FACULTY' AND r.forwarded_role = 'HOD') OR r.applicant_role = 'HOD') AND "
                            + departments.inCollege("r.dept_key"), Map.of())
                    // Dean: HOD requests the Associate Dean forwarded
                    : list("r.applicant_role = 'HOD' AND r.forwarded_role = 'ASSOCIATE_DEAN' AND "
                            + departments.inCollege("r.dept_key"), Map.of());
            default -> list("""
                    r.approver_role = 'CLASS_INCHARGE' AND EXISTS (SELECT 1 FROM students s WHERE s.reg_no = r.reg_no
                      AND EXISTS (SELECT 1 FROM class_incharge c WHERE c.faculty_user_id = :uid AND c.dept_key = s.dept_key
                        AND c.semester = s.semester AND c.section = s.section AND c.from_date <= current_date
                        AND (c.to_date IS NULL OR c.to_date >= current_date)))
                    """, Map.of("uid", me.id()));
        };
        if (me.role() == Role.FACULTY) {
            // Only the classes this faculty member is in-charge of today (a temporary in-charge takes over)
            all = all.stream().filter(l -> {
                ErpSupport.ClassKey c = erp.classOf(l.regNo());
                return erp.isIncharge(me.id(), c.deptKey(), c.semester(), c.section());
            }).toList();
        }
        // Waiting for me first, then the rest (forwarded, decided)
        java.util.function.Predicate<Leave> mine = l -> "PENDING".equals(l.status()) && stage.equals(l.approverRole());
        List<Leave> out = new ArrayList<>(all.stream().filter(mine).toList());
        out.addAll(all.stream().filter(mine.negate()).limit(100).toList());
        return out;
    }

    @PostMapping("/{id}/decide")
    @Transactional
    Leave decide(@PathVariable long id, @RequestBody DecideRequest req, HttpServletRequest http) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        Map<String, Object> r = db.sql("SELECT * FROM leave_requests WHERE id = ? FOR UPDATE").param(id).query().listOfRows()
                .stream().findFirst().orElseThrow(() -> ApiException.notFound("Leave request not found"));
        if (!"PENDING".equals(r.get("status"))) throw ApiException.conflict("This request was already decided or cancelled");
        String approver = (String) r.get("approver_role");
        boolean allowed = switch (approver) {
            case "CLASS_INCHARGE" -> {
                if (me.role() != Role.FACULTY && me.role() != Role.HOD) yield false;
                ErpSupport.ClassKey c = erp.classOf((String) r.get("reg_no"));
                yield erp.isIncharge(me.id(), c.deptKey(), c.semester(), c.section());
            }
            case "HOD" -> me.role() == Role.HOD && me.deptKey().equals(r.get("dept_key"));
            default -> me.role() == Role.DEAN && approver.equals(stageOf(me))
                    && db.sql("SELECT count(*) FROM departments WHERE dept_key = ? AND college_key = ?")
                    .params(r.get("dept_key"), me.collegeKey()).query(Integer.class).single() > 0;
        };
        if (!allowed) throw new ApiException(HttpStatus.FORBIDDEN, "You are not the approver of this request");
        long applicant = ((Number) r.get("applicant_id")).longValue();
        if (applicant == me.id()) throw new ApiException(HttpStatus.FORBIDDEN, "You cannot approve your own leave");
        boolean approve = Boolean.TRUE.equals(req.approve());
        String remarks = req.remarks() == null ? null : clip(req.remarks().trim(), 500);
        if (!approve && (remarks == null || remarks.length() < 3)) throw ApiException.badRequest("Give the reason for rejecting");
        String role = (String) r.get("applicant_role");
        String dept = (String) r.get("dept_key");
        // First step of a staff leave: the HOD / Associate Dean recommends and forwards it to the next approver
        String next = PERMISSION.equals(r.get("leave_code")) ? null
                : "FACULTY".equals(role) && "HOD".equals(approver) ? "ASSOCIATE_DEAN"
                : "HOD".equals(role) && "ASSOCIATE_DEAN".equals(approver) ? "DEAN" : null;
        if (approve && next != null) {
            db.sql("""
                            UPDATE leave_requests SET approver_role = ?, forwarded_by = ?, forwarded_role = ?, forwarded_at = now(),
                                forward_remarks = ? WHERE id = ?
                            """).params(next, me.name(), approver, remarks, id).update();
            action(id, "FORWARDED", me.name(), remarks);
            String who = db.sql("SELECT display_name FROM users WHERE id = ?").param(applicant).query(String.class).single();
            String what = who + "'s leave from " + r.get("from_date") + " to " + r.get("to_date") + " was recommended by " + me.name()
                    + " (" + label(approver) + ")" + (remarks == null ? "" : ": " + remarks) + ".";
            notifyOfficers(next, dept, ("FACULTY".equals(role) ? "Faculty" : "HOD") + " leave forwarded", what + " Open Leave to decide.");
            notifications.notifyUser(applicant, "HOD".equals(role) ? Audience.HOD : Audience.FACULTY, dept, null,
                    "Leave recommended", "Your leave from " + r.get("from_date") + " to " + r.get("to_date") + " was recommended by "
                            + me.name() + " and is now with the " + label(next) + ".", "leave");
            audit.record(me.username(), me.name(), "FORWARDED_LEAVE", "LEAVE-" + id, what, http.getRemoteAddr());
            return get(id);
        }
        db.sql("""
                        UPDATE leave_requests SET status = ?, decided_by = ?, decided_at = now(), decision_remarks = ?
                        WHERE id = ?
                        """).params(approve ? "APPROVED" : "REJECTED", me.name(), remarks, id).update();
        action(id, approve ? "APPROVED" : "REJECTED", me.name(), remarks);

        if (approve && !"STUDENT".equals(role)) {
            // Leave balance (types with a yearly limit)
            db.sql("""
                            INSERT INTO leave_balances (user_id, leave_code, academic_year, allowed, used)
                            SELECT ?, t.code, ?, t.yearly_days, ? FROM leave_types t WHERE t.code = ? AND t.yearly_days IS NOT NULL
                            ON CONFLICT (user_id, leave_code, academic_year) DO UPDATE SET used = leave_balances.used + EXCLUDED.used
                            """).params(applicant, r.get("academic_year"), r.get("days"), r.get("leave_code")).update();
        }
        if (approve && "FACULTY".equals(role)) suggestSubstitutes(id, applicant, dept,
                ((java.sql.Date) r.get("from_date")).toLocalDate(), ((java.sql.Date) r.get("to_date")).toLocalDate());
        String title = "Leave " + (approve ? "approved" : "rejected");
        String msg = "Your leave from " + r.get("from_date") + " to " + r.get("to_date") + " was " + (approve ? "approved" : "rejected")
                + " by " + me.name() + (remarks == null ? "." : ": " + remarks);
        Audience audience = switch (role) {
            case "STUDENT" -> Audience.STUDENT;
            case "HOD" -> Audience.HOD;
            default -> Audience.FACULTY;
        };
        notifications.notifyUser(applicant, audience, dept, null, title, msg, "leave");
        audit.record(me.username(), me.name(), approve ? "APPROVED_LEAVE" : "REJECTED_LEAVE", "LEAVE-" + id, msg, http.getRemoteAddr());
        return get(id);
    }

    /** The data of the official leave form of an approved request: the applicant or anyone in the approval chain. */
    @GetMapping("/{id}/form")
    Form form(@PathVariable long id) {
        CurrentUser me = ErpSupport.require(Role.STUDENT, Role.FACULTY, Role.HOD, Role.DEAN);
        boolean mine = db.sql("SELECT count(*) FROM leave_requests WHERE id = ? AND applicant_id = ?").params(id, me.id())
                .query(Integer.class).single() > 0;
        if (!mine && (me.role() == Role.STUDENT || inbox().stream().noneMatch(l -> l.id() == id))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this");
        }
        Leave l = get(id);
        if (!"APPROVED".equals(l.status())) throw ApiException.conflict("The leave form is available once the leave is approved");
        Map<String, Object> u = db.sql("""
                        SELECT u.display_name, u.username, coalesce(u.designation, CASE r.applicant_role WHEN 'HOD' THEN 'Head of the Department'
                                   WHEN 'STUDENT' THEN 'Student' ELSE 'Faculty' END) AS designation,
                               coalesce(d.name, '') AS dept_name, coalesce(d.college_key, 'engineering') AS college_key, r.applicant_id,
                               r.academic_year
                        FROM leave_requests r JOIN users u ON u.id = r.applicant_id LEFT JOIN departments d ON d.dept_key = r.dept_key
                        WHERE r.id = ?
                        """).param(id).query().singleRow();
        BigDecimal allowed = db.sql("SELECT yearly_days FROM leave_types WHERE code = ?").param(l.leaveCode())
                .query(BigDecimal.class).optional().orElse(null);
        BigDecimal used = db.sql("""
                        SELECT coalesce(sum(days), 0) FROM leave_requests WHERE applicant_id = ? AND leave_code = ? AND academic_year = ?
                          AND status = 'APPROVED'
                        """).params(u.get("applicant_id"), l.leaveCode(), u.get("academic_year")).query(BigDecimal.class).single();
        List<Step> steps = db.sql("SELECT action, actor, remarks, at FROM leave_actions WHERE request_id = ? ORDER BY at, id")
                .param(id).query((rs, n) -> new Step(rs.getString(1), rs.getString(2), rs.getString(3),
                        ErpSupport.display(rs.getObject(4, java.time.OffsetDateTime.class)))).list();
        String college = (String) u.get("college_key");
        return new Form(l, (String) u.get("display_name"), (String) u.get("username"), (String) u.get("designation"),
                (String) u.get("dept_name"), COLLEGE_NAMES.getOrDefault(college, college), allowed, used, steps);
    }

    static final Map<String, String> COLLEGE_NAMES = Map.of(
            "engineering", "Karpaga Vinayaga College of Engineering and Technology",
            "nursing", "Karpaga Vinayaga College of Nursing",
            "pharmacy", "Karpaga Vinayaga Institute for Pharmaceutical Sciences");

    @GetMapping("/{id}/attachment")
    ResponseEntity<byte[]> attachment(@PathVariable long id) {
        CurrentUser me = ErpSupport.require(Role.STUDENT, Role.FACULTY, Role.HOD, Role.DEAN);
        boolean mine = db.sql("SELECT count(*) FROM leave_requests WHERE id = ? AND applicant_id = ?").params(id, me.id())
                .query(Integer.class).single() > 0;
        if (!mine && me.role() != Role.STUDENT && inbox().stream().noneMatch(l -> l.id() == id)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this");
        }
        if (!mine && me.role() == Role.STUDENT) throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this");
        Map<String, Object> r = db.sql("SELECT attachment, attachment_name, attachment_type FROM leave_requests WHERE id = ?")
                .param(id).query().singleRow();
        if (r.get("attachment") == null) throw ApiException.notFound("No attachment");
        return ResponseEntity.ok().contentType(MediaType.parseMediaType((String) r.get("attachment_type")))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"leave-" + id + "\"")
                .header("X-Content-Type-Options", "nosniff").body((byte[]) r.get("attachment"));
    }

    // ---------------------------------------------------------------- helpers

    /** For each leave day (not Sunday) and each subject the faculty member handles: a free colleague of the department. */
    private void suggestSubstitutes(long requestId, long facultyId, String dept, LocalDate from, LocalDate to) {
        List<Map<String, Object>> subjects = db.sql("SELECT dept_key, semester, subject_code FROM faculty_subjects WHERE user_id = ?")
                .param(facultyId).query().listOfRows();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            if (d.getDayOfWeek() == DayOfWeek.SUNDAY) continue;
            for (Map<String, Object> s : subjects) {
                Long sub = db.sql("""
                                SELECT u.id FROM users u
                                WHERE u.role = 'FACULTY' AND u.enabled AND u.dept_key = :dept AND u.id <> :me
                                  AND NOT EXISTS (SELECT 1 FROM leave_requests l WHERE l.applicant_id = u.id
                                                  AND l.status = 'APPROVED' AND :d BETWEEN l.from_date AND l.to_date)
                                ORDER BY EXISTS (SELECT 1 FROM faculty_subjects f WHERE f.user_id = u.id AND f.semester = :sem) DESC,
                                         (SELECT count(*) FROM class_substitutions c WHERE c.substitute_user_id = u.id
                                          AND c.class_date = :d), u.display_name
                                LIMIT 1
                                """).param("dept", dept).param("me", facultyId).param("d", d)
                        .param("sem", s.get("semester")).query(Long.class).optional().orElse(null);
                db.sql("""
                                INSERT INTO class_substitutions (request_id, class_date, dept_key, semester, subject_code, substitute_user_id)
                                VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
                                """).params(requestId, d, s.get("dept_key"), s.get("semester"), s.get("subject_code"), sub).update();
                if (sub != null) {
                    notifications.notifyUser(sub, Audience.FACULTY, dept, null, "Substitute class suggested: " + s.get("subject_code"),
                            "You are suggested to take " + s.get("subject_code") + " on " + d + " (a colleague is on leave).", "leave");
                }
            }
        }
    }

    static int workingDays(LocalDate from, LocalDate to) {
        int n = 0;
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) if (d.getDayOfWeek() != DayOfWeek.SUNDAY) n++;
        return n;
    }

    private void action(long id, String action, String actor, String remarks) {
        db.sql("INSERT INTO leave_actions (request_id, action, actor, remarks) VALUES (?, ?, ?, ?)")
                .params(id, action, actor, remarks).update();
    }

    private Leave get(long id) {
        return list("r.id = :id", Map.of("id", id)).getFirst();
    }

    private List<Leave> list(String where, Map<String, Object> params) {
        return db.sql("""
                        SELECT r.id, u.display_name, r.applicant_role, r.reg_no, r.dept_key, r.leave_code, t.name AS leave_name,
                               r.from_date, r.to_date, r.half_day, r.days, r.reason, r.attachment IS NOT NULL AS has_file,
                               r.approver_role, r.status, r.decided_by, r.decided_at, r.decision_remarks, r.created_at,
                               to_char(r.from_time, 'HH24:MI') AS from_time, to_char(r.to_time, 'HH24:MI') AS to_time, r.hours,
                               r.forwarded_by, r.forwarded_role, r.forwarded_at, r.forward_remarks
                        FROM leave_requests r JOIN users u ON u.id = r.applicant_id JOIN leave_types t ON t.code = r.leave_code
                        WHERE """ + " " + where + " " + """
                         ORDER BY r.created_at DESC LIMIT 300
                        """).params(params)
                .query((rs, n) -> {
                    long id = rs.getLong("id");
                    List<Substitution> subs = db.sql("""
                                    SELECT c.class_date, c.subject_code, coalesce(u.display_name, 'No one free') FROM class_substitutions c
                                    LEFT JOIN users u ON u.id = c.substitute_user_id WHERE c.request_id = ? ORDER BY c.class_date, c.subject_code
                                    """).param(id).query((r2, m) -> new Substitution(r2.getString(1), r2.getString(2), r2.getString(3))).list();
                    return new Leave(id, rs.getString("display_name"), rs.getString("applicant_role"), rs.getString("reg_no"),
                            rs.getString("dept_key"), rs.getString("leave_code"), rs.getString("leave_name"),
                            rs.getString("from_date"), rs.getString("to_date"), rs.getString("half_day"), rs.getBigDecimal("days"),
                            rs.getString("reason"), rs.getBoolean("has_file"), rs.getString("approver_role"), rs.getString("status"),
                            rs.getString("decided_by"), ErpSupport.display(rs.getObject("decided_at", java.time.OffsetDateTime.class)),
                            rs.getString("decision_remarks"), ErpSupport.display(rs.getObject("created_at", java.time.OffsetDateTime.class)),
                            subs, rs.getString("from_time"), rs.getString("to_time"), rs.getBigDecimal("hours"),
                            rs.getString("forwarded_by"), rs.getString("forwarded_role"),
                            ErpSupport.display(rs.getObject("forwarded_at", java.time.OffsetDateTime.class)), rs.getString("forward_remarks"));
                })
                .list();
    }

    static String clip(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
