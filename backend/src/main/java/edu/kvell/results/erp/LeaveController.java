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
 * today, so a temporary in-charge approves while the regular one is away), faculty → HOD, HOD → Associate Dean. Staff
 * leave types with a yearly limit use leave_balances; an approved faculty leave gets a substitute suggested for each of
 * their subjects on each leave day.
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
                               String attachmentName, String attachmentType, String attachmentBase64) {
    }

    public record DecideRequest(Boolean approve, String remarks) {
    }

    public record Substitution(String date, String subjectCode, String substitute) {
    }

    public record Leave(long id, String applicant, String applicantRole, String regNo, String deptKey, String leaveCode,
                        String leaveName, String fromDate, String toDate, String halfDay, BigDecimal days, String reason,
                        boolean hasAttachment, String approverRole, String status, String decidedBy, String decidedAt,
                        String decisionRemarks, String createdAt, List<Substitution> substitutions) {
    }

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
                    BigDecimal limit = rs.getBigDecimal("yearly_days");
                    BigDecimal used = rs.getBigDecimal("used");
                    return new LeaveType(rs.getString("code"), rs.getString("name"), limit, rs.getBoolean("needs_attachment"),
                            used, limit == null || student ? null : limit.subtract(used).max(BigDecimal.ZERO));
                })
                .list();
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
        String half = req.halfDay() == null || req.halfDay().isBlank() ? null : req.halfDay().trim().toUpperCase(Locale.ROOT);
        if (half != null && !half.equals("FN") && !half.equals("AN")) throw ApiException.badRequest("Half day: FN or AN");
        if (half != null && !from.equals(to)) throw ApiException.badRequest("A half-day leave is for one date");
        BigDecimal days = half != null ? new BigDecimal("0.5") : BigDecimal.valueOf(workingDays(from, to));
        if (days.signum() == 0) throw ApiException.badRequest("The dates are all Sundays");
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
            approver = me.role() == Role.FACULTY ? "HOD" : "DEAN";
        }
        long id = db.sql("""
                        INSERT INTO leave_requests (applicant_id, applicant_role, dept_key, reg_no, leave_code, from_date, to_date,
                            half_day, days, reason, attachment, attachment_name, attachment_type, academic_year, approver_role)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                        """).params(me.id(), me.role().name(), deptKey, student ? me.regNo() : null, code, from, to, half, days,
                        reason, file, file == null ? null : clip(req.attachmentName(), 160),
                        file == null ? null : req.attachmentType(), year, approver)
                .query(Long.class).single();
        action(id, "APPLIED", me.name(), reason);
        String what = me.name() + " applied for " + type.get("name") + " (" + days + " day" + (days.compareTo(BigDecimal.ONE) == 0 ? "" : "s")
                + ", " + from + (from.equals(to) ? "" : " to " + to) + ").";
        switch (approver) {
            case "CLASS_INCHARGE" -> notifications.notifyUser(inchargeId, Audience.FACULTY,
                    db.sql("SELECT dept_key FROM users WHERE id = ?").param(inchargeId).query(String.class).single(), null,
                    "Student leave request: " + me.regNo(), what + " Approve or reject it in My Class.", "my-class");
            case "HOD" -> notifications.notify(Audience.HOD, deptKey, null, "Faculty leave request", what + " Open Leave to decide.", "leave");
            default -> notifications.notify(Audience.DEAN, deptKey, null, "HOD leave request", what + " Open Leave to decide.", "leave");
        }
        return get(id);
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
        List<Leave> all = switch (me.role()) {
            case HOD -> list("r.approver_role = 'HOD' AND r.dept_key = :dept", Map.of("dept", me.deptKey()));
            case DEAN -> list("r.approver_role = 'DEAN' AND " + departments.inCollege("r.dept_key"), Map.of());
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
        List<Leave> out = new ArrayList<>(all.stream().filter(l -> "PENDING".equals(l.status())).toList());
        out.addAll(all.stream().filter(l -> !"PENDING".equals(l.status())).limit(50).toList());
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
            default -> me.role() == Role.DEAN && db.sql("SELECT count(*) FROM departments WHERE dept_key = ? AND college_key = ?")
                    .params(r.get("dept_key"), me.collegeKey()).query(Integer.class).single() > 0;
        };
        if (!allowed) throw new ApiException(HttpStatus.FORBIDDEN, "You are not the approver of this request");
        long applicant = ((Number) r.get("applicant_id")).longValue();
        if (applicant == me.id()) throw new ApiException(HttpStatus.FORBIDDEN, "You cannot approve your own leave");
        boolean approve = Boolean.TRUE.equals(req.approve());
        String remarks = req.remarks() == null ? null : clip(req.remarks().trim(), 500);
        if (!approve && (remarks == null || remarks.length() < 3)) throw ApiException.badRequest("Give the reason for rejecting");
        db.sql("""
                        UPDATE leave_requests SET status = ?, decided_by = ?, decided_at = now(), decision_remarks = ?
                        WHERE id = ?
                        """).params(approve ? "APPROVED" : "REJECTED", me.name(), remarks, id).update();
        action(id, approve ? "APPROVED" : "REJECTED", me.name(), remarks);

        String role = (String) r.get("applicant_role");
        String dept = (String) r.get("dept_key");
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
                               r.approver_role, r.status, r.decided_by, r.decided_at, r.decision_remarks, r.created_at
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
                            subs);
                })
                .list();
    }

    static String clip(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
