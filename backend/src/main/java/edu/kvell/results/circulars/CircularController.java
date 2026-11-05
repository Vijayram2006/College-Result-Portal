package edu.kvell.results.circulars;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Departments;
import edu.kvell.results.erp.ErpSupport;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * Circulars. The Associate Dean (or Dean) and the COE issue circulars to all or chosen departments (and optionally to
 * named faculty). A COE circular may need the Dean's approval first; a circular may be scheduled for later. Each HOD
 * keeps a circular for the department or forwards it to the faculty and/or the students of chosen years. Everyone sees
 * only the circulars meant for them; the COE acknowledges and replies to circulars sent to the COE.
 */
@RestController
@RequestMapping("/api/circulars")
public class CircularController {

    static final Set<String> CATEGORIES = Set.of("ACADEMIC", "EXAMINATION", "ADMINISTRATIVE", "EVENTS", "GENERAL");
    static final Set<String> PRIORITIES = Set.of("NORMAL", "HIGH", "URGENT");
    static final Set<String> ROUTING = Set.of("SINGLE_DEPT", "SELECTED_DEPTS", "ALL_DEPTS");
    static final Set<String> AUDIENCES = Set.of("HOD", "FACULTY", "COE", "STUDENTS");
    static final int MAX_ATTACHMENT_CHARS = 7_000_000; // about 5 MB of file as base64

    private final JdbcClient db;
    private final Departments departments;
    private final NotificationService notifications;
    private final ObjectMapper json;

    public CircularController(JdbcClient db, Departments departments, NotificationService notifications, ObjectMapper json) {
        this.db = db;
        this.departments = departments;
        this.notifications = notifications;
        this.json = json;
    }

    // ================================================================ reading

    /** The circulars meant for the signed-in user (scheduled ones are released when their time comes). */
    @GetMapping
    List<Map<String, Object>> list() {
        CurrentUser me = CurrentUser.get();
        String college = departments.college();
        db.sql("UPDATE circulars SET status = 'PUBLISHED' WHERE status = 'SCHEDULED' AND scheduled_for <= now() AND college_key = ?")
                .param(college).update();
        List<Map<String, Object>> rows = db.sql("SELECT * FROM circulars WHERE college_key = ? ORDER BY created_at DESC")
                .param(college).query().listOfRows();
        String year = me.role() == Role.STUDENT
                ? db.sql("SELECT year_label FROM students WHERE reg_no = ?").param(me.regNo()).query(String.class).optional().orElse("")
                : "";
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            Map<String, Object> c = view(r);
            if (visible(me, c, year)) out.add(c);
        }
        return out;
    }

    @GetMapping("/departments")
    List<Map<String, Object>> departmentsList() {
        CurrentUser.get();
        return db.sql("""
                        SELECT d.dept_key AS key, d.name, coalesce(d.code, upper(d.dept_key)) AS code,
                               coalesce((SELECT u.display_name FROM users u WHERE u.role = 'HOD' AND u.enabled AND u.dept_key = d.dept_key
                                         ORDER BY u.id LIMIT 1), d.head_name, 'Head of Department') AS "headName"
                        FROM departments d WHERE d.college_key = ? AND d.status = 'ACTIVE' ORDER BY d.name
                        """).param(departments.college()).query().listOfRows();
    }

    /** Faculty who can be named on a circular (id = their username). */
    @GetMapping("/faculties")
    List<Map<String, Object>> faculties(@RequestParam(required = false) String deptKey) {
        ErpSupport.require(Role.DEAN, Role.ADMIN, Role.SUPER_ADMIN, Role.HOD);
        String dept = deptKey == null || deptKey.isBlank() || "ALL".equalsIgnoreCase(deptKey) ? null : departments.key(deptKey);
        return db.sql("""
                        SELECT u.username AS id, u.display_name AS name,
                               CASE WHEN u.role = 'HOD' THEN 'Head of Department' ELSE 'Faculty' END AS designation,
                               u.dept_key AS "deptKey", d.name AS "deptName", u.username AS "staffId", coalesce(u.email, '') AS email
                        FROM users u JOIN departments d ON d.dept_key = u.dept_key
                        WHERE u.role IN ('FACULTY', 'HOD') AND u.enabled AND d.college_key = ? AND (CAST(? AS VARCHAR) IS NULL OR u.dept_key = ?)
                        ORDER BY d.name, u.display_name
                        """).params(departments.college(), dept, dept).query().listOfRows();
    }

    // ================================================================ issuing

    @PostMapping
    @Transactional
    Map<String, Object> create(@RequestBody Map<String, Object> req) {
        CurrentUser me = ErpSupport.require(Role.DEAN, Role.ADMIN, Role.SUPER_ADMIN);
        String subject = str(req.get("subject")), message = str(req.get("message"));
        if (blank(subject) || blank(message)) throw ApiException.badRequest("Give the subject and the message");
        boolean coe = me.role() != Role.DEAN;
        boolean needsDean = coe && Boolean.TRUE.equals(req.get("requiresDeanApproval"));
        OffsetDateTime scheduled = time(req.get("scheduledFor"));
        String status = needsDean ? "PENDING_DEAN_APPROVAL"
                : scheduled != null && scheduled.isAfter(OffsetDateTime.now()) ? "SCHEDULED" : "PUBLISHED";
        String college = departments.college();
        int seq = db.sql("SELECT count(*) + 101 FROM circulars WHERE college_key = ?").param(college).query(Integer.class).single();
        String ref = (coe ? "KVELL/COE/CIR/" : "KVELL/AD/CIR/") + ErpSupport.today().getYear() + "/" + seq;
        long id = db.sql("""
                        INSERT INTO circulars (college_key, ref_no, subject, message, category, priority, status, target_audiences,
                                               requires_dean_approval, submission_notes, created_by_user_id, created_by_name, created_by_role,
                                               routing_option, target_department_keys, target_faculty_ids, target_faculty_names, attachments,
                                               scheduled_for)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSONB), ?, ?, ?, ?, ?, ?, CAST(? AS JSONB), CAST(? AS JSONB), CAST(? AS JSONB),
                                CAST(? AS JSONB), ?) RETURNING id
                        """)
                .params(college, ref, clip(subject.trim(), 300), message.trim(), pick(req.get("category"), CATEGORIES, "ACADEMIC"),
                        pick(req.get("priority"), PRIORITIES, "NORMAL"), status, write(audiences(req.get("targetAudiences"))), needsDean,
                        nul(req.get("submissionNotes"), 1000), me.id(), me.name(), coe ? "COE" : creatorRole(me),
                        pick(req.get("routingOption"), ROUTING, "ALL_DEPTS"), write(deptKeys(req.get("targetDepartmentKeys"))),
                        write(strings(req.get("targetFacultyIds"))), write(strings(req.get("targetFacultyNames"))),
                        write(attachments(req)), scheduled)
                .query(Long.class).single();
        Map<String, Object> c = one(id);
        if ("PUBLISHED".equals(status)) announce(c);
        if (needsDean) notifyDeans(college, "Circular waiting for your approval", "The COE submitted circular " + ref + ": " + clip(subject.trim(), 80));
        return c;
    }

    @PutMapping("/{id}")
    @Transactional
    Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, Object> req) {
        CurrentUser me = ErpSupport.require(Role.DEAN, Role.ADMIN, Role.SUPER_ADMIN);
        Map<String, Object> r = row(id);
        requireOwnerOrDean(me, r);
        if ("DELETED".equals(r.get("status"))) throw ApiException.conflict("This circular is deleted");
        OffsetDateTime scheduled = req.containsKey("scheduledFor") ? time(req.get("scheduledFor")) : (OffsetDateTime) r.get("scheduled_for");
        db.sql("""
                        UPDATE circulars SET subject = coalesce(?, subject), message = coalesce(?, message), category = coalesce(?, category),
                               priority = coalesce(?, priority), routing_option = coalesce(?, routing_option),
                               target_department_keys = coalesce(CAST(? AS JSONB), target_department_keys),
                               target_faculty_ids = coalesce(CAST(? AS JSONB), target_faculty_ids),
                               target_faculty_names = coalesce(CAST(? AS JSONB), target_faculty_names),
                               target_audiences = coalesce(CAST(? AS JSONB), target_audiences),
                               submission_notes = coalesce(?, submission_notes), attachments = coalesce(CAST(? AS JSONB), attachments),
                               scheduled_for = ?
                        WHERE id = ?
                        """)
                .params(blank(str(req.get("subject"))) ? null : clip(str(req.get("subject")).trim(), 300),
                        blank(str(req.get("message"))) ? null : str(req.get("message")).trim(),
                        req.get("category") == null ? null : pick(req.get("category"), CATEGORIES, "ACADEMIC"),
                        req.get("priority") == null ? null : pick(req.get("priority"), PRIORITIES, "NORMAL"),
                        req.get("routingOption") == null ? null : pick(req.get("routingOption"), ROUTING, "ALL_DEPTS"),
                        req.get("targetDepartmentKeys") == null ? null : write(deptKeys(req.get("targetDepartmentKeys"))),
                        req.get("targetFacultyIds") == null ? null : write(strings(req.get("targetFacultyIds"))),
                        req.get("targetFacultyNames") == null ? null : write(strings(req.get("targetFacultyNames"))),
                        req.get("targetAudiences") == null ? null : write(audiences(req.get("targetAudiences"))),
                        nul(req.get("submissionNotes"), 1000),
                        req.get("attachments") == null && req.get("attachment") == null ? null : write(attachments(req)),
                        scheduled, id)
                .update();
        return one(id);
    }

    @PostMapping("/{id}/release-now")
    @Transactional
    Map<String, Object> releaseNow(@PathVariable long id) {
        CurrentUser me = ErpSupport.require(Role.DEAN, Role.ADMIN, Role.SUPER_ADMIN);
        Map<String, Object> r = row(id);
        requireOwnerOrDean(me, r);
        if (!"SCHEDULED".equals(r.get("status"))) throw ApiException.conflict("This circular is not scheduled");
        db.sql("UPDATE circulars SET status = 'PUBLISHED', scheduled_for = NULL WHERE id = ?").param(id).update();
        Map<String, Object> c = one(id);
        announce(c);
        return c;
    }

    /** The Dean approves or rejects a COE circular. */
    @PostMapping("/{id}/approve")
    @Transactional
    Map<String, Object> approve(@PathVariable long id, @RequestBody Map<String, Object> req) {
        CurrentUser me = ErpSupport.require(Role.DEAN);
        Map<String, Object> r = row(id);
        if (!"PENDING_DEAN_APPROVAL".equals(r.get("status"))) throw ApiException.conflict("This circular is not waiting for approval");
        boolean ok = !"REJECT".equalsIgnoreCase(str(req.get("action")));
        String remarks = nul(req.get("remarks"), 1000);
        if (!ok && remarks == null) throw ApiException.badRequest("Give the reason for rejecting it");
        Map<String, Object> by = new LinkedHashMap<>();
        by.put("id", String.valueOf(me.id()));
        by.put("name", me.name());
        by.put("role", creatorRole(me));
        by.put("approvedAt", OffsetDateTime.now().toString());
        db.sql("UPDATE circulars SET status = ?, approval_remarks = ?, approved_by = CAST(? AS JSONB), approved_at = now() WHERE id = ?")
                .params(ok ? "APPROVED_BY_DEAN" : "REJECTED", remarks, write(by), id).update();
        if (r.get("created_by_user_id") != null) {
            notifications.notifyUser(((Number) r.get("created_by_user_id")).longValue(), Audience.COE, null, null,
                    ok ? "Circular approved" : "Circular rejected",
                    "Circular " + r.get("ref_no") + (ok ? " was approved by the Dean." : " was rejected by the Dean: " + remarks), "/admin/circulars");
        }
        return one(id);
    }

    /** Publishes an approved (or the sender's own) circular to the chosen departments. */
    @PostMapping("/{id}/forward")
    @Transactional
    Map<String, Object> forward(@PathVariable long id, @RequestBody(required = false) Map<String, Object> req) {
        CurrentUser me = ErpSupport.require(Role.DEAN, Role.ADMIN, Role.SUPER_ADMIN);
        Map<String, Object> r = row(id);
        if (Set.of("DELETED", "REJECTED", "PENDING_DEAN_APPROVAL").contains(r.get("status"))) {
            throw ApiException.conflict("This circular cannot be forwarded now (" + String.valueOf(r.get("status")).replace('_', ' ').toLowerCase(Locale.ROOT) + ")");
        }
        if (me.role() != Role.DEAN) requireOwnerOrDean(me, r);
        Map<String, Object> q = req == null ? Map.of() : req;
        db.sql("""
                        UPDATE circulars SET status = 'PUBLISHED', routing_option = coalesce(?, routing_option),
                               target_department_keys = coalesce(CAST(? AS JSONB), target_department_keys),
                               target_faculty_ids = coalesce(CAST(? AS JSONB), target_faculty_ids),
                               target_faculty_names = coalesce(CAST(? AS JSONB), target_faculty_names),
                               target_audiences = coalesce(CAST(? AS JSONB), target_audiences)
                        WHERE id = ?
                        """)
                .params(q.get("routingOption") == null ? null : pick(q.get("routingOption"), ROUTING, "ALL_DEPTS"),
                        q.get("targetDepartmentKeys") == null ? null : write(deptKeys(q.get("targetDepartmentKeys"))),
                        q.get("targetFacultyIds") == null ? null : write(strings(q.get("targetFacultyIds"))),
                        q.get("targetFacultyNames") == null ? null : write(strings(q.get("targetFacultyNames"))),
                        q.get("targetAudiences") == null ? null : write(audiences(q.get("targetAudiences"))), id)
                .update();
        Map<String, Object> c = one(id);
        announce(c);
        return c;
    }

    /** A HOD keeps the circular for the department, or forwards it to the faculty and/or students (of chosen years). */
    @PostMapping("/{id}/hod-action")
    @Transactional
    Map<String, Object> hodAction(@PathVariable long id, @RequestBody Map<String, Object> req) {
        CurrentUser me = ErpSupport.require(Role.HOD, Role.FACULTY);
        Map<String, Object> c = view(row(id));
        if (!visible(me, c, "")) throw new ApiException(HttpStatus.FORBIDDEN, "This circular is not for your department");
        if (me.role() == Role.FACULTY) {
            // A faculty member's read receipt, kept under their own key
            Map<String, Object> seen = new LinkedHashMap<>();
            seen.put("hodId", "FACULTY-" + me.username());
            seen.put("hodName", me.name());
            seen.put("deptKey", me.deptKey());
            seen.put("deptName", departments.name(me.deptKey()));
            seen.put("action", "SEEN");
            seen.put("forwardedAt", OffsetDateTime.now().toString());
            seen.put("remarks", "Viewed by " + me.name());
            db.sql("UPDATE circulars SET hod_actions = hod_actions || jsonb_build_object(?, CAST(? AS JSONB)) WHERE id = ?")
                    .params("FACULTY_" + me.username().toLowerCase(Locale.ROOT), write(seen), id).update();
            return one(id);
        }
        String action = pick(req.get("action"), Set.of("KEPT", "FORWARDED", "SEEN"), "SEEN");
        String target = action.equals("FORWARDED") ? pick(req.get("target"), Set.of("FACULTY_ONLY", "STUDENTS_ONLY", "FACULTY_AND_STUDENTS"), "FACULTY_ONLY") : null;
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("hodId", String.valueOf(me.id()));
        entry.put("hodName", me.name());
        entry.put("deptKey", me.deptKey());
        entry.put("deptName", departments.name(me.deptKey()));
        entry.put("action", action);
        if (target != null) entry.put("target", target);
        List<String> years = strings(req.get("targetYears"));
        if (!years.isEmpty()) entry.put("targetYears", years);
        entry.put("forwardedAt", OffsetDateTime.now().toString());
        String remarks = nul(req.get("remarks"), 500);
        if (remarks != null) entry.put("remarks", remarks);
        db.sql("UPDATE circulars SET hod_actions = hod_actions || jsonb_build_object(?, CAST(? AS JSONB)) WHERE id = ?")
                .params(me.deptKey(), write(entry), id).update();
        if ("FORWARDED".equals(action)) {
            String what = "Circular " + c.get("refNo") + ": " + clip(String.valueOf(c.get("subject")), 80);
            if (!"STUDENTS_ONLY".equals(target)) notifications.notify(Audience.FACULTY, me.deptKey(), null, "New circular", what, "circular");
            if (!"FACULTY_ONLY".equals(target)) {
                if (years.isEmpty()) {
                    notifications.notify(Audience.STUDENT, me.deptKey(), null, "New circular", what, "circular");
                } else {
                    for (Integer sem : db.sql("SELECT DISTINCT semester FROM students WHERE dept_key = ? AND year_label IN (:y)".replace("(:y)",
                                    "(" + String.join(",", years.stream().map(y -> "'" + y.replace("'", "") + "'").toList()) + ")"))
                            .param(me.deptKey()).query(Integer.class).list()) {
                        notifications.notify(Audience.STUDENT, me.deptKey(), sem, "New circular", what, "circular");
                    }
                }
            }
        }
        return one(id);
    }

    @PostMapping("/{id}/ack")
    @Transactional
    Map<String, Object> ack(@PathVariable long id) {
        ErpSupport.require(Role.ADMIN, Role.SUPER_ADMIN);
        row(id);
        db.sql("UPDATE circulars SET seen_by_coe = TRUE, seen_at = coalesce(seen_at, now()) WHERE id = ?").param(id).update();
        return one(id);
    }

    @PostMapping("/{id}/reply")
    @Transactional
    Map<String, Object> reply(@PathVariable long id, @RequestBody Map<String, Object> req) {
        CurrentUser me = ErpSupport.require(Role.ADMIN, Role.SUPER_ADMIN);
        Map<String, Object> r = row(id);
        String text = nul(req.get("reply"), 2000);
        if (text == null) throw ApiException.badRequest("Write the reply");
        db.sql("UPDATE circulars SET seen_by_coe = TRUE, seen_at = coalesce(seen_at, now()), coe_reply = ?, coe_reply_at = now() WHERE id = ?")
                .params(text, id).update();
        if (r.get("created_by_user_id") != null) {
            notifications.notifyUser(((Number) r.get("created_by_user_id")).longValue(), Audience.DEAN, null, null, "COE replied to a circular",
                    me.name() + " replied to circular " + r.get("ref_no") + ": " + clip(text, 120), "circular");
        }
        return one(id);
    }

    @DeleteMapping("/{id}")
    @Transactional
    Map<String, Object> delete(@PathVariable long id) {
        CurrentUser me = ErpSupport.require(Role.DEAN, Role.ADMIN, Role.SUPER_ADMIN);
        Map<String, Object> r = row(id);
        requireOwnerOrDean(me, r);
        Map<String, Object> by = Map.of("id", String.valueOf(me.id()), "name", me.name(), "role", me.role() == Role.DEAN ? creatorRole(me) : "COE");
        db.sql("UPDATE circulars SET status = 'DELETED', deleted_by = CAST(? AS JSONB), deleted_at = now() WHERE id = ?").params(write(by), id).update();
        return one(id);
    }

    // ================================================================ rules

    /** Who sees a circular: the Dean everything; the COE its own and those sent to the COE; the others per the routing. */
    private boolean visible(CurrentUser me, Map<String, Object> c, String studentYear) {
        String status = (String) c.get("status");
        List<String> audiences = listOf(c.get("targetAudiences"));
        switch (me.role()) {
            case DEAN:
                return true;
            case ADMIN:
            case SUPER_ADMIN:
                return "COE".equals(((Map<?, ?>) c.get("createdBy")).get("role")) || audiences.contains("COE");
            default:
                break;
        }
        if (!"PUBLISHED".equals(status) && !"DELETED".equals(status)) return false;
        String dept = me.deptKey();
        boolean deptMatch = "ALL_DEPTS".equals(c.get("routingOption")) || listOf(c.get("targetDepartmentKeys")).contains(dept);
        if (!deptMatch || dept == null) return false;
        Map<?, ?> action = (Map<?, ?>) ((Map<?, ?>) c.get("hodActions")).get(dept);
        String target = action == null ? null : (String) action.get("target");
        boolean forwarded = action != null && "FORWARDED".equals(action.get("action"));
        switch (me.role()) {
            case HOD:
                return audiences.isEmpty() || audiences.contains("HOD") || audiences.contains("FACULTY");
            case FACULTY: {
                List<String> named = listOf(c.get("targetFacultyIds"));
                if (!named.isEmpty()) return named.stream().anyMatch(n -> n.equalsIgnoreCase(me.username()));
                return audiences.contains("FACULTY")
                        || (forwarded && ("FACULTY_ONLY".equals(target) || "FACULTY_AND_STUDENTS".equals(target)));
            }
            case STUDENT: {
                if (!forwarded || !("STUDENTS_ONLY".equals(target) || "FACULTY_AND_STUDENTS".equals(target))) return false;
                Object years = action.get("targetYears");
                return years == null || ((List<?>) years).isEmpty() || ((List<?>) years).contains(studentYear);
            }
            default:
                return false;
        }
    }

    private void announce(Map<String, Object> c) {
        List<String> audiences = listOf(c.get("targetAudiences"));
        List<String> depts = "ALL_DEPTS".equals(c.get("routingOption"))
                ? db.sql("SELECT dept_key FROM departments WHERE college_key = ?").param(departments.college()).query(String.class).list()
                : listOf(c.get("targetDepartmentKeys"));
        String what = "Circular " + c.get("refNo") + ": " + clip(String.valueOf(c.get("subject")), 80);
        for (String d : depts) {
            if (audiences.isEmpty() || audiences.contains("HOD")) notifications.notify(Audience.HOD, d, null, "New circular", what, "circular");
            if (audiences.contains("FACULTY") && listOf(c.get("targetFacultyIds")).isEmpty()) {
                notifications.notify(Audience.FACULTY, d, null, "New circular", what, "circular");
            }
        }
        for (String username : listOf(c.get("targetFacultyIds"))) {
            db.sql("SELECT id, dept_key FROM users WHERE lower(username) = lower(?)").param(username).query().listOfRows().stream().findFirst()
                    .ifPresent(u -> notifications.notifyUser(((Number) u.get("id")).longValue(), Audience.FACULTY, (String) u.get("dept_key"),
                            null, "New circular", what, "circular"));
        }
        if (audiences.contains("COE") && !"COE".equals(((Map<?, ?>) c.get("createdBy")).get("role"))) {
            notifications.notify(Audience.COE, null, null, "New circular", what, "/admin/circulars");
        }
    }

    private void notifyDeans(String college, String title, String message) {
        for (Long id : db.sql("SELECT id FROM users WHERE role = 'DEAN' AND enabled AND college_key = ?").param(college).query(Long.class).list()) {
            notifications.notifyUser(id, Audience.DEAN, null, null, title, message, "circular");
        }
    }

    private void requireOwnerOrDean(CurrentUser me, Map<String, Object> r) {
        if (me.role() == Role.DEAN) return;
        boolean own = r.get("created_by_user_id") != null && ((Number) r.get("created_by_user_id")).longValue() == me.id();
        boolean coeCircular = "COE".equals(r.get("created_by_role"));
        if (!own && !coeCircular) throw new ApiException(HttpStatus.FORBIDDEN, "Only the sender or the Dean can change this circular");
    }

    private Map<String, Object> row(long id) {
        return db.sql("SELECT * FROM circulars WHERE id = ? AND college_key = ?").params(id, departments.college())
                .query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("Circular not found"));
    }

    private Map<String, Object> one(long id) {
        return view(row(id));
    }

    private Map<String, Object> view(Map<String, Object> r) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("id", r.get("id"));
        c.put("refNo", r.get("ref_no"));
        c.put("subject", r.get("subject"));
        c.put("message", r.get("message"));
        c.put("category", r.get("category"));
        c.put("priority", r.get("priority"));
        c.put("status", r.get("status"));
        c.put("targetAudiences", read(r.get("target_audiences")));
        c.put("requiresDeanApproval", r.get("requires_dean_approval"));
        c.put("submissionNotes", r.get("submission_notes"));
        c.put("approvalRemarks", r.get("approval_remarks"));
        c.put("approvedBy", read(r.get("approved_by")));
        c.put("approvedAt", ts(r.get("approved_at")));
        List<Object> atts = listRaw(read(r.get("attachments")));
        c.put("attachments", atts);
        c.put("attachment", atts.isEmpty() ? null : atts.get(0));
        Map<String, Object> by = new LinkedHashMap<>();
        by.put("id", String.valueOf(r.get("created_by_user_id")));
        by.put("name", r.get("created_by_name"));
        by.put("role", r.get("created_by_role"));
        c.put("createdBy", by);
        c.put("createdAt", ts(r.get("created_at")));
        c.put("routingOption", r.get("routing_option"));
        List<String> keys = listOf(read(r.get("target_department_keys")));
        c.put("targetDepartmentKeys", keys);
        c.put("targetDepartmentNames", keys.stream().map(k -> {
            try {
                return departments.name(k);
            } catch (Exception e) {
                return k;
            }
        }).toList());
        c.put("targetFacultyIds", read(r.get("target_faculty_ids")));
        c.put("targetFacultyNames", read(r.get("target_faculty_names")));
        c.put("hodActions", read(r.get("hod_actions")));
        c.put("seenByCoe", r.get("seen_by_coe"));
        c.put("seenAt", ts(r.get("seen_at")));
        c.put("coeReply", r.get("coe_reply"));
        c.put("coeReplyAt", ts(r.get("coe_reply_at")));
        c.put("scheduledFor", ts(r.get("scheduled_for")));
        c.put("deletedBy", read(r.get("deleted_by")));
        c.put("deletedAt", ts(r.get("deleted_at")));
        return c;
    }

    private List<Map<String, Object>> attachments(Map<String, Object> req) {
        Object raw = req.get("attachments");
        List<Object> list = raw instanceof List<?> l && !l.isEmpty() ? new ArrayList<>(l) : new ArrayList<>();
        if (list.isEmpty() && req.get("attachment") instanceof Map<?, ?> one) list.add(one);
        List<Map<String, Object>> out = new ArrayList<>();
        long total = 0;
        for (Object o : list) {
            if (!(o instanceof Map<?, ?> m)) continue;
            Map<String, Object> a = new LinkedHashMap<>();
            a.put("name", clip(str(m.get("name")) == null ? "attachment" : str(m.get("name")), 200));
            a.put("size", m.get("size"));
            a.put("type", m.get("type"));
            String data = str(m.get("dataUrl"));
            if (data != null) {
                if (!data.startsWith("data:")) throw ApiException.badRequest("Attach the file itself");
                total += data.length();
                a.put("dataUrl", data);
            }
            out.add(a);
        }
        if (total > MAX_ATTACHMENT_CHARS) throw ApiException.badRequest("The attachments are larger than 5 MB in all");
        return out;
    }

    private List<String> audiences(Object o) {
        List<String> l = strings(o).stream().map(s -> s.toUpperCase(Locale.ROOT)).filter(AUDIENCES::contains).distinct().toList();
        return l.isEmpty() ? List.of("HOD") : l;
    }

    private List<String> deptKeys(Object o) {
        List<String> out = new ArrayList<>();
        for (String s : strings(o)) {
            try {
                String k = departments.key(s);
                if (!out.contains(k)) out.add(k);
            } catch (Exception e) {
                throw ApiException.badRequest("Unknown department: " + s);
            }
        }
        return out;
    }

    private static List<String> strings(Object o) {
        if (!(o instanceof List<?> l)) return new ArrayList<>();
        return l.stream().filter(x -> x != null && !x.toString().isBlank()).map(x -> x.toString().trim()).toList();
    }

    @SuppressWarnings("unchecked")
    private static List<String> listOf(Object o) {
        return o instanceof List<?> l ? l.stream().map(String::valueOf).toList() : List.of();
    }

    @SuppressWarnings("unchecked")
    private static List<Object> listRaw(Object o) {
        return o instanceof List<?> l ? (List<Object>) l : List.of();
    }

    private Object read(Object jsonb) {
        if (jsonb == null) return null;
        return json.readValue(jsonb.toString(), new TypeReference<Object>() { });
    }

    private String write(Object o) {
        return json.writeValueAsString(o);
    }

    private String creatorRole(CurrentUser me) {
        String title = db.sql("SELECT officer_title FROM users WHERE id = ?").param(me.id()).query(String.class).optional().orElse(null);
        return "DEAN".equals(title) ? "DEAN" : "ASSOCIATE_DEAN";
    }

    private static String pick(Object v, Set<String> allowed, String fallback) {
        String s = v == null ? null : v.toString().trim().toUpperCase(Locale.ROOT);
        return s != null && allowed.contains(s) ? s : fallback;
    }

    private static OffsetDateTime time(Object o) {
        if (o == null || o.toString().isBlank()) return null;
        String s = o.toString().trim();
        try {
            return OffsetDateTime.parse(s);
        } catch (Exception e) {
            try {
                return java.time.LocalDateTime.parse(s).atZone(ErpSupport.IST).toOffsetDateTime();
            } catch (Exception e2) {
                throw ApiException.badRequest("Invalid schedule time: " + s);
            }
        }
    }

    private static String ts(Object o) {
        if (o == null) return null;
        if (o instanceof java.sql.Timestamp t) return t.toInstant().toString();
        return o.toString();
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String nul(Object o, int max) {
        String s = str(o);
        return blank(s) ? null : clip(s.trim(), max);
    }

    private static String clip(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }
}
