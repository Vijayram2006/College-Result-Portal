package edu.kvell.results.grievances;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Departments;
import edu.kvell.results.erp.ErpSupport;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.ContentDisposition;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Student grievances. A student writes to the class in-charge, a subject faculty member, the mentor or the HOD. The
 * person holding it approves (resolved), rejects (with a reason) or forwards it: faculty to the HOD, the HOD to the
 * Associate Dean. A grievance left 48 hours without action moves up by itself. The student sees every step.
 */
@RestController
public class GrievanceController {

    static final long ESCALATE_HOURS = 48;
    static final int MAX_BYTES = 5 * 1024 * 1024;
    static final Set<String> CATEGORIES = Set.of("CLASS_FACULTY", "HOD", "SUBJECT_FACULTY", "MENTOR");

    public record Recipient(long id, String name, String username, String role, String deptKey, String deptName,
                            String category, String designation) {
    }

    public record Summary(long id, String refId, String regNo, String studentName, String deptKey, String subject,
                          String status, String currentHandlerRole, String currentHandlerName, String handlerName,
                          boolean hasAttachment, String attachmentName, String createdAt, String handlerReceivedAt,
                          boolean autoForwarded, String recipientCategory) {
    }

    public record Remark(String by, String role, String text, String at) {
    }

    public record Detail(long id, String refId, String regNo, String studentName, String deptKey, String deptName,
                         String collegeKey, String subject, String description, String attachmentName, Integer attachmentSize,
                         String sentToRole, String sentToName, String currentHandlerRole, String currentHandlerName,
                         String status, List<Remark> remarks, String createdAt, String handlerReceivedAt, String resolvedAt,
                         boolean autoForwarded, boolean overdue48hrs, String recipientCategory) {
    }

    public record ActionRequest(String action, String remark) {
    }

    public record CreateJson(String subject, String description, String sentToRole, Long sentToUserId, String recipientCategory) {
    }

    private final JdbcClient db;
    private final ErpSupport erp;
    private final Departments departments;
    private final NotificationService notifications;

    public GrievanceController(JdbcClient db, ErpSupport erp, Departments departments, NotificationService notifications) {
        this.db = db;
        this.erp = erp;
        this.departments = departments;
        this.notifications = notifications;
    }

    // ================================================================ student

    /** The people the student may write to: class in-charge, subject faculty, mentor and the HOD. */
    @GetMapping("/api/student/grievances/recipients")
    List<Recipient> recipients() {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        ErpSupport.ClassKey c = erp.classOf(me.regNo());
        String deptName = departments.name(c.deptKey());
        List<Recipient> out = new ArrayList<>();
        erp.currentIncharge(c.deptKey(), c.semester(), c.section())
                .ifPresent(id -> user(id).ifPresent(u -> out.add(recipient(u, "FACULTY", deptName, "CLASS_FACULTY", "Class In-charge"))));
        for (Long id : db.sql("SELECT DISTINCT user_id FROM faculty_subjects WHERE dept_key = ? AND semester = ?")
                .params(c.deptKey(), c.semester()).query(Long.class).list()) {
            user(id).ifPresent(u -> out.add(recipient(u, "FACULTY", deptName, "SUBJECT_FACULTY", "Subject Faculty")));
        }
        db.sql("SELECT faculty_user_id FROM mentor_allocations WHERE reg_no = ? AND status = 'APPROVED'").param(me.regNo())
                .query(Long.class).optional()
                .ifPresent(id -> user(id).ifPresent(u -> out.add(recipient(u, "FACULTY", deptName, "MENTOR", "Mentor"))));
        db.sql("SELECT id FROM users WHERE role = 'HOD' AND enabled AND dept_key = ? ORDER BY id LIMIT 1").param(c.deptKey())
                .query(Long.class).optional()
                .ifPresent(id -> user(id).ifPresent(u -> out.add(recipient(u, "HOD", deptName, "HOD", "Head of Department"))));
        return out;
    }

    @PostMapping(value = "/api/student/grievances", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    Summary createMultipart(@RequestParam String subject, @RequestParam String description, @RequestParam String sentToRole,
                            @RequestParam Long sentToUserId, @RequestParam(required = false) String recipientCategory,
                            @RequestParam(required = false) MultipartFile file) throws java.io.IOException {
        byte[] data = null;
        String name = null, type = null;
        if (file != null && !file.isEmpty()) {
            if (file.getSize() > MAX_BYTES) throw ApiException.badRequest("The attachment is larger than 5 MB");
            data = file.getBytes();
            name = clip(file.getOriginalFilename() == null ? "attachment" : file.getOriginalFilename(), 200);
            type = file.getContentType() == null ? "application/octet-stream" : clip(file.getContentType(), 100);
        }
        return create(subject, description, sentToRole, sentToUserId, recipientCategory, data, name, type);
    }

    @PostMapping(value = "/api/student/grievances", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Transactional
    Summary createJson(@RequestBody CreateJson req) {
        if (req == null) throw ApiException.badRequest("Fill in the grievance");
        return create(req.subject(), req.description(), req.sentToRole(), req.sentToUserId(), req.recipientCategory(), null, null, null);
    }

    @GetMapping("/api/student/grievances")
    List<Summary> mine() {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        escalate();
        return summaries("g.reg_no = ?", me.regNo());
    }

    @GetMapping("/api/student/grievances/{id}")
    Detail myDetail(@PathVariable long id) {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        escalate();
        if (summaries("g.reg_no = ? AND g.id = ?", me.regNo(), id).isEmpty()) throw ApiException.notFound("Grievance not found");
        return detail(id);
    }

    // ================================================================ handlers

    @GetMapping({"/api/faculty/grievances", "/api/hod/grievances", "/api/dean/grievances"})
    List<Summary> handlerList() {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        escalate();
        Object[] p = scopeParams(me);
        return summaries(scope(me), p);
    }

    @GetMapping({"/api/faculty/grievances/{id}", "/api/hod/grievances/{id}", "/api/dean/grievances/{id}"})
    Detail handlerDetail(@PathVariable long id) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        escalate();
        requireVisible(me, id);
        return detail(id);
    }

    /** Grievances of the college waiting more than 48 hours at any level (the Associate Dean's alert list). */
    @GetMapping("/api/dean/grievances/pending-alerts")
    List<Summary> alerts() {
        ErpSupport.require(Role.DEAN);
        escalate();
        return summaries(departments.inCollege("g.dept_key") + " AND g.status = 'WAITING' AND g.created_at < now() - interval '48 hours'");
    }

    @PostMapping({"/api/faculty/grievances/{id}/action", "/api/hod/grievances/{id}/action", "/api/dean/grievances/{id}/action"})
    @Transactional
    Detail act(@PathVariable long id, @RequestBody ActionRequest req) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        escalate();
        Map<String, Object> g = row(id);
        if (!"WAITING".equals(g.get("status"))) throw ApiException.conflict("This grievance is already closed");
        String level = (String) g.get("current_handler_role");
        boolean mine = switch (me.role()) {
            case FACULTY -> "FACULTY".equals(level) && g.get("current_handler_user_id") != null
                    && ((Number) g.get("current_handler_user_id")).longValue() == me.id();
            case HOD -> "HOD".equals(level) && me.deptKey().equals(g.get("dept_key"));
            case DEAN -> "DEAN".equals(level) && inCollege((String) g.get("dept_key"));
            default -> false;
        };
        if (!mine) throw new ApiException(HttpStatus.FORBIDDEN, "This grievance is not with you now");
        String action = req == null || req.action() == null ? "" : req.action().toUpperCase(Locale.ROOT);
        String remark = req == null || req.remark() == null || req.remark().isBlank() ? null : clip(req.remark().trim(), 2000);
        String roleLabel = roleLabel(me.role());
        switch (action) {
            case "APPROVE" -> {
                db.sql("UPDATE grievances SET status = 'APPROVED', resolved_at = now() WHERE id = ?").param(id).update();
                remark(id, me.name(), roleLabel, remark == null ? "Approved and resolved." : remark);
                tellStudent(g, "Your grievance " + g.get("ref_id") + " was approved by the " + roleLabel + ".");
            }
            case "REJECT" -> {
                if (remark == null) throw ApiException.badRequest("Give the reason for rejecting it");
                db.sql("UPDATE grievances SET status = 'REJECTED', resolved_at = now() WHERE id = ?").param(id).update();
                remark(id, me.name(), roleLabel, remark);
                tellStudent(g, "Your grievance " + g.get("ref_id") + " was rejected by the " + roleLabel + ": " + remark);
            }
            case "FORWARD" -> {
                if ("DEAN".equals(level)) throw ApiException.badRequest("The Associate Dean is the last level; approve or reject it");
                moveUp(g, false);
                remark(id, me.name(), roleLabel, remark == null ? "Forwarded to the " + ("FACULTY".equals(level) ? "HOD" : "Associate Dean") + "." : remark);
            }
            default -> throw ApiException.badRequest("Approve, reject or forward");
        }
        return detail(id);
    }

    @GetMapping("/api/grievances/{id}/attachment")
    ResponseEntity<byte[]> attachment(@PathVariable long id) {
        CurrentUser me = CurrentUser.get();
        if (me.role() == Role.STUDENT) {
            if (summaries("g.reg_no = ? AND g.id = ?", me.regNo(), id).isEmpty()) throw ApiException.notFound("Grievance not found");
        } else {
            ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
            requireVisible(me, id);
        }
        Map<String, Object> a = db.sql("SELECT attachment, attachment_name, attachment_type FROM grievances WHERE id = ? AND attachment IS NOT NULL")
                .param(id).query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("No attachment"));
        MediaType type;
        try {
            type = MediaType.parseMediaType((String) a.get("attachment_type"));
        } catch (Exception e) {
            type = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok().contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename((String) a.get("attachment_name"), StandardCharsets.UTF_8).build().toString())
                .body((byte[]) a.get("attachment"));
    }

    // ================================================================ rules

    private Summary create(String subject, String description, String sentToRole, Long sentToUserId, String category,
                           byte[] data, String name, String type) {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        if (subject == null || subject.isBlank() || description == null || description.isBlank()) {
            throw ApiException.badRequest("Give the subject and describe the grievance");
        }
        if (sentToUserId == null) throw ApiException.badRequest("Choose whom to send it to");
        Recipient to = recipients().stream().filter(r -> r.id() == sentToUserId).findFirst()
                .orElseThrow(() -> ApiException.badRequest("You can send a grievance only to your class in-charge, subject faculty, mentor or HOD"));
        String role = "HOD".equals(to.role()) ? "HOD" : "FACULTY";
        String cat = category != null && CATEGORIES.contains(category.toUpperCase(Locale.ROOT)) ? category.toUpperCase(Locale.ROOT) : to.category();
        ErpSupport.ClassKey c = erp.classOf(me.regNo());
        int seq = db.sql("SELECT count(*) + 1 FROM grievances").query(Integer.class).single();
        String ref = "GRV-" + ErpSupport.today().getYear() + "-" + String.format("%05d", seq);
        long id = db.sql("""
                        INSERT INTO grievances (ref_id, reg_no, dept_key, subject, description, attachment, attachment_name, attachment_type,
                                                attachment_size, sent_to_role, sent_to_user_id, sent_to_name, recipient_category,
                                                current_handler_role, current_handler_user_id, current_handler_name, reached_hod)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                        """)
                .params(ref, me.regNo(), c.deptKey(), clip(subject.trim(), 200), clip(description.trim(), 4000), data, name, type,
                        data == null ? null : data.length, role, to.id(), to.name(), cat, role, to.id(), to.name(), "HOD".equals(role))
                .query(Long.class).single();
        remark(id, me.name(), "Student", "Submitted to " + to.name() + " (" + to.designation() + ").");
        notifications.notifyUser(to.id(), "HOD".equals(role) ? Audience.HOD : Audience.FACULTY, c.deptKey(), null, "New grievance",
                me.name() + " (" + me.regNo() + ") sent a grievance: " + clip(subject.trim(), 80) + ". Act on it within 48 hours.", "grievance");
        return summaries("g.id = ?", id).get(0);
    }

    /** Moves a waiting grievance one level up (faculty -> HOD -> Associate Dean). */
    private void moveUp(Map<String, Object> g, boolean auto) {
        long id = ((Number) g.get("id")).longValue();
        String dept = (String) g.get("dept_key");
        if ("FACULTY".equals(g.get("current_handler_role"))) {
            Map<String, Object> hod = db.sql("SELECT id, display_name FROM users WHERE role = 'HOD' AND enabled AND dept_key = ? ORDER BY id LIMIT 1")
                    .param(dept).query().listOfRows().stream().findFirst().orElse(null);
            db.sql("""
                            UPDATE grievances SET current_handler_role = 'HOD', current_handler_user_id = ?, current_handler_name = ?,
                                   handler_received_at = now(), reached_hod = TRUE, auto_forwarded = auto_forwarded OR ? WHERE id = ?
                            """).params(hod == null ? null : hod.get("id"), hod == null ? "Head of Department" : hod.get("display_name"), auto, id).update();
            notifications.notify(Audience.HOD, dept, null, auto ? "Grievance escalated (48 hours)" : "Grievance forwarded to you",
                    "Grievance " + g.get("ref_id") + " of " + g.get("reg_no") + " is now with you.", "grievance");
        } else {
            db.sql("""
                            UPDATE grievances SET current_handler_role = 'DEAN', current_handler_user_id = NULL, current_handler_name = 'Associate Dean',
                                   handler_received_at = now(), reached_dean = TRUE, auto_forwarded = auto_forwarded OR ? WHERE id = ?
                            """).params(auto, id).update();
            for (Long uid : db.sql("""
                            SELECT u.id FROM users u JOIN departments d ON d.college_key = u.college_key
                            WHERE d.dept_key = ? AND u.role = 'DEAN' AND u.enabled AND coalesce(u.officer_title, 'ASSOCIATE_DEAN') = 'ASSOCIATE_DEAN'
                            """).param(dept).query(Long.class).list()) {
                notifications.notifyUser(uid, Audience.DEAN, dept, null, auto ? "Grievance escalated (48 hours)" : "Grievance forwarded to you",
                        "Grievance " + g.get("ref_id") + " of " + g.get("reg_no") + " is now with you.", "grievance");
            }
        }
        tellStudent(g, "Your grievance " + g.get("ref_id") + " moved to the " + ("FACULTY".equals(g.get("current_handler_role")) ? "HOD" : "Associate Dean")
                + (auto ? " (no action within 48 hours)." : "."));
    }

    /** Grievances left 48 hours without action move up a level. */
    private void escalate() {
        for (Map<String, Object> g : db.sql("""
                        SELECT * FROM grievances WHERE status = 'WAITING' AND current_handler_role IN ('FACULTY', 'HOD')
                          AND handler_received_at < now() - make_interval(hours => ?)
                        """).param((int) ESCALATE_HOURS).query().listOfRows()) {
            String from = (String) g.get("current_handler_role");
            moveUp(g, true);
            remark(((Number) g.get("id")).longValue(), "System", "System",
                    "No action by the " + ("FACULTY".equals(from) ? "faculty" : "HOD") + " within 48 hours: forwarded to the "
                            + ("FACULTY".equals(from) ? "HOD" : "Associate Dean") + ".");
        }
    }

    private String scope(CurrentUser me) {
        return switch (me.role()) {
            case FACULTY -> "(g.sent_to_user_id = ? OR g.current_handler_user_id = ?)";
            case HOD -> "g.dept_key = ? AND (g.sent_to_role = 'HOD' OR g.reached_hod)";
            default -> departments.inCollege("g.dept_key") + " AND g.reached_dean";
        };
    }

    private Object[] scopeParams(CurrentUser me) {
        return switch (me.role()) {
            case FACULTY -> new Object[]{me.id(), me.id()};
            case HOD -> new Object[]{me.deptKey()};
            default -> new Object[]{};
        };
    }

    private void requireVisible(CurrentUser me, long id) {
        Object[] p = scopeParams(me);
        Object[] all = java.util.Arrays.copyOf(p, p.length + 1);
        all[p.length] = id;
        if (summaries(scope(me) + " AND g.id = ?", all).isEmpty()) throw ApiException.notFound("Grievance not found");
    }

    private List<Summary> summaries(String where, Object... params) {
        return db.sql("""
                        SELECT g.id, g.ref_id, g.reg_no, s.name, g.dept_key, g.subject, g.status, g.current_handler_role, g.current_handler_name,
                               g.sent_to_name, g.attachment IS NOT NULL, g.attachment_name, g.created_at, g.handler_received_at, g.auto_forwarded,
                               g.recipient_category
                        FROM grievances g JOIN students s ON s.reg_no = g.reg_no
                        WHERE""" + " " + where + " ORDER BY (g.status = 'WAITING') DESC, g.created_at DESC")
                .params(params)
                .query((rs, n) -> new Summary(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), rs.getString(7), rs.getString(8), rs.getString(9), rs.getString(10), rs.getBoolean(11),
                        rs.getString(12), ts(rs.getObject(13, OffsetDateTime.class)), ts(rs.getObject(14, OffsetDateTime.class)),
                        rs.getBoolean(15), rs.getString(16)))
                .list();
    }

    private Detail detail(long id) {
        Map<String, Object> g = row(id);
        String dept = (String) g.get("dept_key");
        String college = db.sql("SELECT college_key FROM departments WHERE dept_key = ?").param(dept).query(String.class).single();
        List<Remark> remarks = db.sql("SELECT by_name, role, text, at FROM grievance_remarks WHERE grievance_id = ? ORDER BY at, id")
                .param(id).query((rs, n) -> new Remark(rs.getString(1), rs.getString(2), rs.getString(3), ts(rs.getObject(4, OffsetDateTime.class))))
                .list();
        OffsetDateTime received = (OffsetDateTime) obj(g.get("handler_received_at"));
        boolean overdue = "WAITING".equals(g.get("status")) && received != null && received.isBefore(OffsetDateTime.now().minusHours(ESCALATE_HOURS));
        String name = db.sql("SELECT name FROM students WHERE reg_no = ?").param(g.get("reg_no")).query(String.class).single();
        return new Detail(id, (String) g.get("ref_id"), (String) g.get("reg_no"), name, dept, departments.name(dept), college,
                (String) g.get("subject"), (String) g.get("description"), (String) g.get("attachment_name"),
                g.get("attachment_size") == null ? null : ((Number) g.get("attachment_size")).intValue(), (String) g.get("sent_to_role"),
                (String) g.get("sent_to_name"), (String) g.get("current_handler_role"), (String) g.get("current_handler_name"),
                (String) g.get("status"), remarks, ts((OffsetDateTime) obj(g.get("created_at"))), ts(received),
                ts((OffsetDateTime) obj(g.get("resolved_at"))), (Boolean) g.get("auto_forwarded"), overdue, (String) g.get("recipient_category"));
    }

    private Map<String, Object> row(long id) {
        return db.sql("""
                        SELECT id, ref_id, reg_no, dept_key, subject, description, attachment_name, attachment_size, sent_to_role, sent_to_name,
                               recipient_category, current_handler_role, current_handler_user_id, current_handler_name, status,
                               handler_received_at, auto_forwarded, created_at, resolved_at
                        FROM grievances WHERE id = ?
                        """).param(id).query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("Grievance not found"));
    }

    private void remark(long id, String by, String role, String text) {
        db.sql("INSERT INTO grievance_remarks (grievance_id, by_name, role, text) VALUES (?, ?, ?, ?)").params(id, by, role, clip(text, 2000)).update();
    }

    private void tellStudent(Map<String, Object> g, String message) {
        db.sql("SELECT id FROM users WHERE reg_no = ? LIMIT 1").param(g.get("reg_no")).query(Long.class).optional()
                .ifPresent(uid -> notifications.notifyUser(uid, Audience.STUDENT, null, null, "Grievance update", message, "grievance"));
    }

    private boolean inCollege(String dept) {
        return db.sql("SELECT count(*) FROM departments WHERE dept_key = ? AND college_key = ?").params(dept, departments.college())
                .query(Integer.class).single() > 0;
    }

    private java.util.Optional<Map<String, Object>> user(long id) {
        return db.sql("SELECT id, display_name, username, dept_key FROM users WHERE id = ? AND enabled").param(id).query().listOfRows().stream().findFirst();
    }

    private static Recipient recipient(Map<String, Object> u, String role, String deptName, String category, String designation) {
        return new Recipient(((Number) u.get("id")).longValue(), (String) u.get("display_name"), (String) u.get("username"), role,
                (String) u.get("dept_key"), deptName, category, designation);
    }

    private static String roleLabel(Role r) {
        return switch (r) {
            case FACULTY -> "Faculty";
            case HOD -> "HOD";
            case DEAN -> "Associate Dean";
            default -> r.name();
        };
    }

    private static Object obj(Object o) {
        if (o instanceof java.sql.Timestamp t) return t.toInstant().atOffset(java.time.ZoneOffset.UTC);
        return o;
    }

    private static String ts(OffsetDateTime t) {
        return t == null ? null : t.toString();
    }

    private static String clip(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }
}
