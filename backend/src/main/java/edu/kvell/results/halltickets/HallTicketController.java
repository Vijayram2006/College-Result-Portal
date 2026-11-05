package edu.kvell.results.halltickets;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Departments;
import edu.kvell.results.eligibility.EligibilityController;
import edu.kvell.results.erp.ErpSupport;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * Hall tickets (college COE). A cohort is academic year + batch + department + year + semester. The COE designs a
 * template for the cohort and fixes it (each fix is a saved version), generates the tickets (papers: the semester's
 * subjects plus the student's arrears), reviews them and publishes. A ticket is held back (BLOCKED_FEES) when the
 * student is not eligible for the exam (attendance below the requirement and not condoned) or owes the exam fee.
 * Published tickets can be withdrawn and restored; students raise queries about mistakes, which the COE answers.
 */
@RestController
public class HallTicketController {

    static final Set<String> BODY_KEYS = Set.of("examTitle", "examinationCentre", "notes", "sigCandidate", "sigCoe",
            "sigPrincipal", "showPhoto", "photoPosition", "photoSize", "logoSource", "logoImage", "logoMime",
            "backgroundImage", "backgroundMime", "layoutJson");

    /** The cohort a request is about. */
    record Cohort(String college, String academicYear, String batch, String dept, String yearLabel, int semester) {
    }

    public record TemplateRef(String academicYear, String batch, String templateName, Long templateId, String deptKey,
                              String departmentKey, String yearLabel, Integer semester, Long versionId) {
    }

    public record CohortRequest(String academicYear, String batch, Integer semester, String departmentKey, String deptKey,
                                String yearLabel, Long ticketId, String reviewerName, String reason) {
    }

    public record ReasonRequest(String reason) {
    }

    public record RespondRequest(String response) {
    }

    public record QueryRequest(String message) {
    }

    public record QueryView(long id, long hallTicketId, String studentReg, String studentName, String message, String status,
                            String coeResponse, String respondedBy, String respondedAt, String createdAt) {
    }

    public record TicketView(long id, String studentReg, String studentName, String deptKey, String deptName, int semester,
                             String section, long examTimetableId, String examTitle, String hallTicketNo, String status,
                             boolean feePaid, String publishedBy, String publishedAt, String createdAt, String withdrawnBy,
                             String withdrawnAt, String withdrawReason, String restoredBy, String restoredAt) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final NotificationService notifications;
    private final EligibilityController eligibility;
    private final ObjectMapper json;

    public HallTicketController(JdbcClient db, Departments departments, NotificationService notifications,
                                EligibilityController eligibility, ObjectMapper json) {
        this.db = db;
        this.departments = departments;
        this.notifications = notifications;
        this.eligibility = eligibility;
        this.json = json;
    }

    // ================================================================ cohorts and students

    @GetMapping("/api/admin/hall-tickets/cohorts/departments")
    List<Map<String, Object>> cohortDepartments() {
        admin();
        return db.sql("""
                        SELECT d.dept_key AS "deptKey", coalesce(d.code, upper(d.dept_key)) AS code, d.name,
                               (SELECT count(*) FROM students s WHERE s.dept_key = d.dept_key) AS "studentCount"
                        FROM departments d WHERE d.college_key = ? AND d.status = 'ACTIVE' ORDER BY d.name
                        """).param(departments.college()).query().listOfRows();
    }

    @GetMapping("/api/admin/hall-tickets/cohorts/years")
    List<String> cohortYears(@RequestParam(required = false) String departmentKey) {
        admin();
        return db.sql("SELECT DISTINCT year_label FROM students WHERE (CAST(? AS VARCHAR) IS NULL OR dept_key = ?) AND"
                        + departments.inCollege("dept_key") + "ORDER BY 1")
                .params(blank(departmentKey), blank(departmentKey)).query(String.class).list();
    }

    @GetMapping("/api/admin/hall-tickets/cohorts/semesters")
    List<Integer> cohortSemesters(@RequestParam(required = false) String departmentKey, @RequestParam(required = false) String yearLabel) {
        admin();
        return db.sql("SELECT DISTINCT semester FROM students WHERE (CAST(? AS VARCHAR) IS NULL OR dept_key = ?) "
                        + "AND (CAST(? AS VARCHAR) IS NULL OR year_label = ?) AND" + departments.inCollege("dept_key") + "ORDER BY 1")
                .params(blank(departmentKey), blank(departmentKey), blank(yearLabel), blank(yearLabel)).query(Integer.class).list();
    }

    @GetMapping("/api/admin/hall-tickets/selection/students")
    List<Map<String, Object>> selectionStudents(@RequestParam(required = false) String departmentKey,
                                                @RequestParam(required = false) String yearLabel,
                                                @RequestParam(required = false) Integer semester) {
        admin();
        if (blank(departmentKey) == null) return List.of();
        String dept = deptInCollege(departmentKey);
        String deptName = departments.name(dept);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> s : students(dept, blank(yearLabel), semester)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("registerNumber", s.get("reg_no"));
            m.put("name", s.get("name"));
            m.put("dateOfBirth", dob(s.get("dob")));
            m.put("degreeBranch", degree(deptName));
            m.put("semester", s.get("semester"));
            m.put("section", s.get("section"));
            m.put("yearLabel", s.get("year_label"));
            m.put("departmentKey", dept);
            m.put("papers", papersOf((String) s.get("reg_no"), dept, ((Number) s.get("semester")).intValue()));
            out.add(m);
        }
        return out;
    }

    // ================================================================ templates

    @GetMapping("/api/admin/hall-tickets/templates")
    List<Map<String, Object>> templates(@RequestParam String academicYear, @RequestParam String batch,
                                        @RequestParam(required = false) String departmentKey,
                                        @RequestParam(required = false) String yearLabel,
                                        @RequestParam(required = false) Integer semester) {
        admin();
        Cohort c = cohort(academicYear, batch, departmentKey, yearLabel, semester, false);
        return db.sql("""
                        SELECT * FROM hall_ticket_templates WHERE college_key = ? AND academic_year = ? AND batch = ?
                          AND dept_key = ? AND year_label = ? AND semester = ? ORDER BY updated_at DESC
                        """).params(c.college(), c.academicYear(), c.batch(), c.dept(), c.yearLabel(), c.semester())
                .query().listOfRows().stream().map(this::templateView).toList();
    }

    /** The cohort's template: by id or name, otherwise the most recently changed one, otherwise the reference (not saved). */
    @GetMapping("/api/admin/hall-tickets/template")
    Map<String, Object> template(@RequestParam(required = false) String academicYear, @RequestParam(required = false) String batch,
                                 @RequestParam(required = false) String templateName, @RequestParam(required = false) Long templateId,
                                 @RequestParam(required = false) String departmentKey, @RequestParam(required = false) String yearLabel,
                                 @RequestParam(required = false) Integer semester) {
        admin();
        if (templateId != null) return templateView(templateRow(templateId));
        Cohort c = cohort(academicYear, batch, departmentKey, yearLabel, semester, false);
        Map<String, Object> row = findTemplate(c, blank(templateName));
        return row != null ? templateView(row) : referenceView(c, blank(templateName) == null ? "Reference" : templateName.trim());
    }

    @PostMapping("/api/admin/hall-tickets/template/new")
    @Transactional
    Map<String, Object> createTemplate(@RequestBody TemplateRef req) {
        CurrentUser me = admin();
        Cohort c = cohort(req.academicYear(), req.batch(), dept(req), req.yearLabel(), req.semester(), false);
        String name = blank(req.templateName());
        if (name == null) throw ApiException.badRequest("Give the template a name");
        if (findTemplate(c, name) != null) throw ApiException.conflict("A template named \"" + name + "\" already exists for this cohort");
        long id = insertTemplate(c, clip(name, 80), defaults(c), me.name());
        return templateView(templateRow(id));
    }

    @PutMapping("/api/admin/hall-tickets/template")
    @Transactional
    Map<String, Object> saveTemplate(@RequestBody Map<String, Object> req) {
        CurrentUser me = admin();
        Cohort c = cohort(str(req.get("academicYear")), str(req.get("batch")), firstNonBlank(str(req.get("deptKey")), str(req.get("departmentKey"))),
                str(req.get("yearLabel")), req.get("semester") == null ? null : ((Number) req.get("semester")).intValue(), false);
        String name = blank(str(req.get("templateName")));
        if (name == null) name = "Reference";
        Map<String, Object> body = new LinkedHashMap<>();
        for (String k : BODY_KEYS) if (req.containsKey(k)) body.put(k, req.get(k));
        if (blank(str(body.get("examTitle"))) == null) throw ApiException.badRequest("Give the examination title");
        if (blank(str(body.get("examinationCentre"))) == null) throw ApiException.badRequest("Give the examination centre");
        Map<String, Object> row = findTemplate(c, name);
        if (row == null) {
            long id = insertTemplate(c, clip(name, 80), merge(defaults(c), body), me.name());
            return templateView(templateRow(id));
        }
        if ("FIXED".equals(row.get("status"))) throw ApiException.conflict("The template is fixed. Unfix it to make changes.");
        long id = ((Number) row.get("id")).longValue();
        db.sql("UPDATE hall_ticket_templates SET body = CAST(? AS JSONB), updated_by = ?, updated_at = now() WHERE id = ?")
                .params(write(merge(read(row.get("body")), body)), me.name(), id).update();
        return templateView(templateRow(id));
    }

    @PostMapping("/api/admin/hall-tickets/template/fix")
    @Transactional
    Map<String, Object> fix(@RequestBody TemplateRef req) {
        CurrentUser me = admin();
        Map<String, Object> row = resolve(req, true);
        if ("FIXED".equals(row.get("status"))) return templateView(row);
        long id = ((Number) row.get("id")).longValue();
        int version = ((Number) row.get("version")).intValue() + 1;
        db.sql("UPDATE hall_ticket_templates SET status = 'FIXED', version = ?, fixed_by = ?, fixed_at = now() WHERE id = ?")
                .params(version, me.name(), id).update();
        db.sql("INSERT INTO hall_ticket_template_versions (template_id, version_number, body, source, fixed_by) VALUES (?, ?, CAST(? AS JSONB), 'FIX', ?)")
                .params(id, version, write(read(row.get("body"))), me.name()).update();
        return templateView(templateRow(id));
    }

    @PostMapping("/api/admin/hall-tickets/template/unfix")
    @Transactional
    Map<String, Object> unfix(@RequestBody TemplateRef req) {
        CurrentUser me = admin();
        Map<String, Object> row = resolve(req, true);
        long id = ((Number) row.get("id")).longValue();
        db.sql("UPDATE hall_ticket_templates SET status = 'DRAFT', updated_by = ?, updated_at = now() WHERE id = ?").params(me.name(), id).update();
        return templateView(templateRow(id));
    }

    @GetMapping("/api/admin/hall-tickets/template/versions")
    List<Map<String, Object>> versions() {
        admin();
        return db.sql("""
                        SELECT v.id, v.template_id AS "templateId", v.version_number AS "versionNumber", t.college_key AS "collegeKey",
                               t.academic_year AS "academicYear", t.batch, nullif(t.dept_key, '') AS "deptKey",
                               nullif(t.year_label, '') AS "yearLabel", nullif(t.semester, 0) AS semester, t.template_name AS "templateName",
                               v.source, v.fixed_by AS "fixedBy", v.fixed_at::text AS "fixedAt"
                        FROM hall_ticket_template_versions v JOIN hall_ticket_templates t ON t.id = v.template_id
                        WHERE t.college_key = ? ORDER BY v.fixed_at DESC LIMIT 100
                        """).param(departments.college()).query().listOfRows();
    }

    @PostMapping("/api/admin/hall-tickets/template/use-previous")
    @Transactional
    Map<String, Object> usePrevious(@RequestBody TemplateRef req) {
        CurrentUser me = admin();
        if (req.versionId() == null) throw ApiException.badRequest("Choose a saved version");
        Map<String, Object> v = db.sql("""
                        SELECT v.body FROM hall_ticket_template_versions v JOIN hall_ticket_templates t ON t.id = v.template_id
                        WHERE v.id = ? AND t.college_key = ?
                        """).params(req.versionId(), departments.college()).query().listOfRows().stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Saved version not found"));
        Cohort c = cohort(req.academicYear(), req.batch(), dept(req), req.yearLabel(), req.semester(), false);
        return copyInto(c, read(v.get("body")), me);
    }

    @PostMapping("/api/admin/hall-tickets/template/use-reference")
    @Transactional
    Map<String, Object> useReference(@RequestBody TemplateRef req) {
        CurrentUser me = admin();
        Cohort c = cohort(req.academicYear(), req.batch(), dept(req), req.yearLabel(), req.semester(), false);
        return copyInto(c, defaults(c), me);
    }

    // ================================================================ readiness, preview, generation

    @GetMapping("/api/admin/hall-tickets/readiness")
    Map<String, Object> readiness(@RequestParam(required = false) String academicYear, @RequestParam(required = false) String batch,
                                  @RequestParam(required = false) String departmentKey, @RequestParam(required = false) String yearLabel,
                                  @RequestParam(required = false) Integer semester) {
        admin();
        List<String> missing = new ArrayList<>();
        int count = 0;
        if (blank(academicYear) == null) missing.add("Enter the academic year");
        if (blank(batch) == null) missing.add("Enter the batch");
        if (blank(departmentKey) == null) missing.add("Choose the department");
        if (semester == null) missing.add("Choose the semester");
        if (missing.isEmpty()) {
            Cohort c = cohort(academicYear, batch, departmentKey, yearLabel, semester, true);
            count = students(c.dept(), blank(yearLabel), c.semester()).size();
            if (count == 0) missing.add("No students in this department and semester");
            if (fixedTemplate(c) == null) missing.add("Fix the hall ticket template first");
            int subjects = db.sql("SELECT count(*) FROM subjects WHERE dept_key = ? AND semester = ?").params(c.dept(), c.semester())
                    .query(Integer.class).single();
            if (subjects == 0) missing.add("No subjects are set up for this semester");
        }
        return Map.of("canGenerate", missing.isEmpty(), "studentCount", count, "missing", missing);
    }

    @GetMapping("/api/admin/hall-tickets/preview")
    Map<String, Object> preview(@RequestParam(required = false) String academicYear, @RequestParam(required = false) String batch,
                                @RequestParam(required = false) Integer semester, @RequestParam(required = false) String departmentKey,
                                @RequestParam(required = false) String yearLabel, @RequestParam(required = false) String templateName,
                                @RequestParam(required = false) Long templateId) {
        admin();
        Map<String, Object> t = template(academicYear, batch, templateName, templateId, departmentKey, yearLabel, semester);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("template", t);
        out.put("studentFound", false);
        out.put("papers", List.of());
        if (blank(departmentKey) == null || semester == null) return out;
        String dept = deptInCollege(departmentKey);
        List<Map<String, Object>> list = students(dept, blank(yearLabel), semester);
        if (list.isEmpty()) return out;
        Map<String, Object> s = list.get(0);
        String reg = (String) s.get("reg_no");
        out.put("studentFound", true);
        out.put("registerNumber", reg);
        out.put("name", s.get("name"));
        out.put("dateOfBirth", dob(s.get("dob")));
        out.put("degreeBranch", degree(departments.name(dept)));
        out.put("semester", roman(semester));
        out.put("section", s.get("section"));
        out.put("departmentKey", dept);
        out.put("examinationCentre", t.get("examinationCentre"));
        out.put("hallTicketNo", ticketNo(academicYear, semester, reg));
        out.put("papers", papersOf(reg, dept, semester));
        return out;
    }

    @PostMapping("/api/admin/hall-tickets/generate")
    @Transactional
    Map<String, Object> generate(@RequestBody CohortRequest req) {
        CurrentUser me = admin();
        Cohort c = cohort(req, true);
        Map<String, Object> t = fixedTemplate(c);
        if (t == null) throw ApiException.badRequest("Fix the hall ticket template first");
        Map<String, Object> body = read(t.get("body"));
        int version = ((Number) t.get("version")).intValue();
        int created = 0, updated = 0, skippedPublished = 0, papersWritten = 0;
        List<String> skipped = new ArrayList<>();
        for (Map<String, Object> s : students(c.dept(), c.yearLabel().isEmpty() ? null : c.yearLabel(), c.semester())) {
            String reg = (String) s.get("reg_no");
            Map<String, Object> existing = db.sql("SELECT id, status FROM hall_tickets WHERE reg_no = ? AND academic_year = ? AND batch = ? AND semester = ?")
                    .params(reg, c.academicYear(), c.batch(), c.semester()).query().listOfRows().stream().findFirst().orElse(null);
            if (existing != null && Set.of("PUBLISHED", "WITHDRAWN").contains(existing.get("status"))) {
                skippedPublished++;
                skipped.add(reg);
                continue;
            }
            List<Map<String, Object>> papers = papersOf(reg, c.dept(), c.semester());
            papersWritten += papers.size();
            if (existing == null) {
                db.sql("""
                                INSERT INTO hall_tickets (college_key, reg_no, academic_year, batch, dept_key, year_label, semester, hall_ticket_no,
                                                          template_id, template_version, exam_title, exam_centre, papers)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSONB))
                                """).params(c.college(), reg, c.academicYear(), c.batch(), c.dept(), s.get("year_label"), c.semester(),
                        ticketNo(c.academicYear(), c.semester(), reg), t.get("id"), version, clip(str(body.get("examTitle")), 200),
                        clip(str(body.get("examinationCentre")), 200), write(papers)).update();
                created++;
            } else {
                db.sql("""
                                UPDATE hall_tickets SET template_id = ?, template_version = ?, exam_title = ?, exam_centre = ?,
                                       papers = CAST(? AS JSONB), status = 'GENERATED', created_at = now() WHERE id = ?
                                """).params(t.get("id"), version, clip(str(body.get("examTitle")), 200), clip(str(body.get("examinationCentre")), 200),
                        write(papers), existing.get("id")).update();
                updated++;
            }
        }
        // The cohort must be reviewed again after a (re)generation
        db.sql("DELETE FROM hall_ticket_reviews WHERE college_key = ? AND academic_year = ? AND batch = ? AND dept_key = ? AND semester = ?")
                .params(c.college(), c.academicYear(), c.batch(), c.dept(), c.semester()).update();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("success", true);
        out.put("created", created);
        out.put("updated", updated);
        out.put("rebuilt", updated);
        out.put("papersWritten", papersWritten);
        out.put("skippedPublished", skippedPublished);
        out.put("skippedNoBatch", 0);
        out.put("skippedRegNos", skipped);
        out.put("message", created + " created, " + updated + " regenerated" + (skippedPublished > 0 ? ", " + skippedPublished
                + " already published (withdraw them first to regenerate)" : "") + ". Review them before publishing.");
        return out;
    }

    // ================================================================ review and publishing

    @GetMapping("/api/admin/hall-tickets/review")
    Map<String, Object> review(@RequestParam String academicYear, @RequestParam String batch, @RequestParam Integer semester,
                               @RequestParam String departmentKey, @RequestParam(required = false) String yearLabel) {
        admin();
        Cohort c = cohort(academicYear, batch, departmentKey, yearLabel, semester, true);
        return reviewOf(c);
    }

    @PostMapping("/api/admin/hall-tickets/review/confirm")
    @Transactional
    Map<String, Object> confirm(@RequestBody CohortRequest req) {
        admin();
        Cohort c = cohort(req, true);
        String reviewer = blank(req.reviewerName());
        if (reviewer == null) throw ApiException.badRequest("Enter the reviewer's name");
        Map<String, Object> t = fixedTemplate(c);
        if (t == null) throw ApiException.badRequest("Fix the hall ticket template first");
        Map<String, Object> r = reviewOf(c);
        if (((List<?>) r.get("tickets")).isEmpty()) throw ApiException.badRequest("Generate the hall tickets first");
        int version = ((Number) t.get("version")).intValue();
        db.sql("""
                        INSERT INTO hall_ticket_reviews (college_key, academic_year, batch, dept_key, semester, template_version, reviewed_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (college_key, academic_year, batch, dept_key, semester)
                        DO UPDATE SET template_version = EXCLUDED.template_version, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = now()
                        """).params(c.college(), c.academicYear(), c.batch(), c.dept(), c.semester(), version, clip(reviewer, 120)).update();
        return Map.of("reviewed", true, "reviewedBy", reviewer, "reviewedAt", OffsetDateTime.now().toString(),
                "templateVersion", version, "message", "Review confirmed by " + reviewer + ". The hall tickets can now be published.");
    }

    @PostMapping("/api/admin/hall-tickets/publish-reviewed")
    @Transactional
    Map<String, Object> publish(@RequestBody CohortRequest req) {
        CurrentUser me = admin();
        Cohort c = cohort(req, true);
        Map<String, Object> r = reviewOf(c);
        if (!(Boolean) r.get("reviewed")) throw ApiException.badRequest("Confirm the review before publishing");
        if (((Number) r.get("blockingCount")).intValue() > 0) throw ApiException.badRequest("Clear the blocking issues before publishing");
        Map<String, String> held = heldBack(c);
        List<Map<String, Object>> tickets = db.sql("""
                        SELECT id, reg_no FROM hall_tickets WHERE college_key = ? AND academic_year = ? AND batch = ? AND dept_key = ?
                          AND semester = ? AND status IN ('GENERATED', 'BLOCKED_FEES') AND (CAST(? AS BIGINT) IS NULL OR id = ?)
                        """).params(c.college(), c.academicYear(), c.batch(), c.dept(), c.semester(), req.ticketId(), req.ticketId())
                .query().listOfRows();
        int published = 0;
        List<String> blocked = new ArrayList<>();
        for (Map<String, Object> t : tickets) {
            String reg = (String) t.get("reg_no");
            if (held.containsKey(reg)) {
                db.sql("UPDATE hall_tickets SET status = 'BLOCKED_FEES' WHERE id = ?").param(t.get("id")).update();
                blocked.add(reg);
                continue;
            }
            db.sql("UPDATE hall_tickets SET status = 'PUBLISHED', published_by = ?, published_at = now() WHERE id = ?")
                    .params(me.name(), t.get("id")).update();
            published++;
            studentUser(reg).ifPresent(uid -> notifications.notifyUser(uid, Audience.STUDENT, null, null, "Hall ticket published",
                    "Your hall ticket for the semester " + c.semester() + " examinations is published. Open Hall Ticket to download it.",
                    "hall-ticket"));
        }
        return Map.of("publishedCount", published, "supersededCount", 0, "blockedCount", blocked.size(), "blockedRegNos", blocked,
                "message", published + " published" + (blocked.isEmpty() ? "." : ", " + blocked.size()
                        + " held back (not eligible for the exam or exam fee unpaid)."));
    }

    @GetMapping({"/api/admin/hall-tickets/template/tickets", "/api/admin/hall-tickets"})
    List<TicketView> tickets(@RequestParam(required = false) String academicYear, @RequestParam(required = false) String batch,
                             @RequestParam(required = false) Integer semester, @RequestParam(required = false) String departmentKey,
                             @RequestParam(required = false) String status) {
        admin();
        String dept = blank(departmentKey) == null ? null : deptInCollege(departmentKey);
        return ticketsWhere("""
                        t.college_key = ? AND (CAST(? AS VARCHAR) IS NULL OR t.academic_year = ?) AND (CAST(? AS VARCHAR) IS NULL OR t.batch = ?)
                        AND (CAST(? AS SMALLINT) IS NULL OR t.semester = ?) AND (CAST(? AS VARCHAR) IS NULL OR t.dept_key = ?)
                        AND (CAST(? AS VARCHAR) IS NULL OR t.status = ?)
                        """, departments.college(), blank(academicYear), blank(academicYear), blank(batch), blank(batch), semester, semester,
                dept, dept, blank(status), blank(status));
    }

    @PostMapping("/api/admin/hall-tickets/ticket/{id}/withdraw")
    @Transactional
    Map<String, Object> withdraw(@PathVariable long id, @RequestBody ReasonRequest req) {
        CurrentUser me = admin();
        String reason = req == null ? null : blank(req.reason());
        if (reason == null) throw ApiException.badRequest("Give the reason for withdrawing it");
        Map<String, Object> t = ticket(id);
        if ("WITHDRAWN".equals(t.get("status"))) throw ApiException.conflict("This hall ticket is already withdrawn");
        db.sql("UPDATE hall_tickets SET status = 'WITHDRAWN', withdrawn_by = ?, withdrawn_at = now(), withdraw_reason = ? WHERE id = ?")
                .params(me.name(), clip(reason, 500), id).update();
        studentUser((String) t.get("reg_no")).ifPresent(uid -> notifications.notifyUser(uid, Audience.STUDENT, null, null,
                "Hall ticket withdrawn", "Your hall ticket was withdrawn by the COE: " + reason, "hall-ticket"));
        return Map.of("success", true, "message", "Hall ticket withdrawn.");
    }

    @PostMapping("/api/admin/hall-tickets/selection/withdraw-all")
    @Transactional
    Map<String, Object> withdrawAll(@RequestBody CohortRequest req) {
        CurrentUser me = admin();
        String reason = blank(req.reason());
        if (reason == null) throw ApiException.badRequest("Give the reason for withdrawing them");
        Cohort c = cohort(req, true);
        int n = db.sql("""
                        UPDATE hall_tickets SET status = 'WITHDRAWN', withdrawn_by = ?, withdrawn_at = now(), withdraw_reason = ?
                        WHERE college_key = ? AND academic_year = ? AND batch = ? AND dept_key = ? AND semester = ? AND status <> 'WITHDRAWN'
                        """).params(me.name(), clip(reason, 500), c.college(), c.academicYear(), c.batch(), c.dept(), c.semester()).update();
        return Map.of("withdrawnCount", n, "message", n + " hall ticket" + (n == 1 ? "" : "s") + " withdrawn.");
    }

    @PostMapping("/api/admin/hall-tickets/ticket/{id}/restore")
    @Transactional
    Map<String, Object> restore(@PathVariable long id) {
        CurrentUser me = admin();
        Map<String, Object> t = ticket(id);
        if (!"WITHDRAWN".equals(t.get("status"))) throw ApiException.conflict("Only a withdrawn hall ticket can be restored");
        String status = t.get("published_at") != null ? "PUBLISHED" : "GENERATED";
        db.sql("UPDATE hall_tickets SET status = ?, restored_by = ?, restored_at = now() WHERE id = ?").params(status, me.name(), id).update();
        return Map.of("ticketId", id, "status", status, "message", "Hall ticket restored (" + status.toLowerCase(Locale.ROOT) + ").");
    }

    // ================================================================ queries

    @GetMapping("/api/admin/hall-tickets/queries")
    List<QueryView> queries() {
        admin();
        return queriesWhere("t.college_key = ?", departments.college());
    }

    @PostMapping("/api/admin/hall-tickets/queries/{id}/respond")
    @Transactional
    QueryView respond(@PathVariable long id, @RequestBody RespondRequest req) {
        CurrentUser me = admin();
        String text = req == null ? null : blank(req.response());
        if (text == null) throw ApiException.badRequest("Write the response");
        List<QueryView> q = queriesWhere("q.id = ? AND t.college_key = ?", id, departments.college());
        if (q.isEmpty()) throw ApiException.notFound("Query not found");
        db.sql("UPDATE hall_ticket_queries SET status = 'RESOLVED', coe_response = ?, responded_by = ?, responded_at = now() WHERE id = ?")
                .params(clip(text, 1000), me.name(), id).update();
        studentUser(q.get(0).studentReg()).ifPresent(uid -> notifications.notifyUser(uid, Audience.STUDENT, null, null,
                "Hall ticket query answered", "The COE answered your hall ticket query: " + clip(text, 200), "hall-ticket"));
        return queriesWhere("q.id = ?", id).get(0);
    }

    // ================================================================ student

    @GetMapping("/api/student/hallticket/my-ticket")
    Map<String, Object> myTicket() {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        Map<String, Object> t = latestPublished(me.regNo());
        if (t == null) return Map.of("published", false);
        Map<String, Object> s = db.sql("SELECT name, dob, dept_key FROM students WHERE reg_no = ?").param(me.regNo()).query().singleRow();
        List<Map<String, Object>> papers = new ArrayList<>();
        for (Map<String, Object> p : readList(t.get("papers"))) {
            if (Boolean.FALSE.equals(p.get("isActive"))) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("sNo", papers.size() + 1);
            m.put("code", p.get("subjectCode"));
            m.put("title", p.get("subjectTitle"));
            m.put("semester", p.get("paperSemester"));
            m.put("isArrear", "ARREAR".equals(p.get("paperType")));
            papers.add(m);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("published", true);
        out.put("id", t.get("id"));
        out.put("regNo", me.regNo());
        out.put("name", s.get("name"));
        out.put("dob", dob(s.get("dob")));
        out.put("degreeAndBranch", degree(departments.name((String) s.get("dept_key"))));
        out.put("semester", roman(((Number) t.get("semester")).intValue()));
        out.put("examTitle", t.get("exam_title"));
        out.put("examCentre", t.get("exam_centre"));
        out.put("hallTicketNo", t.get("hall_ticket_no"));
        out.put("papers", papers);
        return out;
    }

    @GetMapping("/api/student/hall-tickets")
    List<Map<String, Object>> myTickets() {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        return db.sql("""
                        SELECT t.id, t.reg_no, s.name, d.name AS dept_name, t.college_key, t.semester, s.section, t.exam_title,
                               t.hall_ticket_no, t.status, t.published_at, t.papers
                        FROM hall_tickets t JOIN students s ON s.reg_no = t.reg_no JOIN departments d ON d.dept_key = t.dept_key
                        WHERE t.reg_no = ? AND t.status IN ('PUBLISHED', 'BLOCKED_FEES') ORDER BY t.published_at DESC NULLS LAST
                        """).param(me.regNo()).query().listOfRows().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.get("id"));
            m.put("studentReg", r.get("reg_no"));
            m.put("studentName", r.get("name"));
            m.put("deptName", r.get("dept_name"));
            m.put("collegeKey", r.get("college_key"));
            m.put("semester", r.get("semester"));
            m.put("section", r.get("section"));
            m.put("examTimetableId", 0);
            m.put("examTitle", r.get("exam_title"));
            m.put("hallTicketNo", r.get("hall_ticket_no"));
            m.put("status", r.get("status"));
            m.put("publishedAt", r.get("published_at") == null ? null : r.get("published_at").toString());
            List<Map<String, Object>> schedule = new ArrayList<>();
            for (Map<String, Object> p : readList(r.get("papers"))) {
                if (Boolean.FALSE.equals(p.get("isActive"))) continue;
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("id", schedule.size() + 1);
                e.put("examDate", p.get("examDate"));
                e.put("dayName", "");
                e.put("session", p.get("session") == null ? "" : p.get("session"));
                e.put("startTime", "");
                e.put("endTime", "");
                e.put("subjectCode", p.get("subjectCode"));
                e.put("subjectTitle", p.get("subjectTitle"));
                schedule.add(e);
            }
            m.put("schedule", schedule);
            return m;
        }).toList();
    }

    /** A query about the student's published hall ticket (the id in the path is checked, else the latest is used). */
    @PostMapping("/api/student/hall-tickets/{id}/queries")
    @Transactional
    QueryView raiseQuery(@PathVariable long id, @RequestBody QueryRequest req) {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        String msg = req == null ? null : blank(req.message());
        if (msg == null) throw ApiException.badRequest("Describe the mistake");
        if (msg.length() > 500) throw ApiException.badRequest("The message is at most 500 characters");
        Long ticketId = db.sql("SELECT id FROM hall_tickets WHERE id = ? AND reg_no = ? AND status IN ('PUBLISHED', 'BLOCKED_FEES')")
                .params(id, me.regNo()).query(Long.class).optional().orElse(null);
        if (ticketId == null) {
            Map<String, Object> t = latestPublished(me.regNo());
            if (t == null) throw ApiException.badRequest("You have no published hall ticket");
            ticketId = ((Number) t.get("id")).longValue();
        }
        long qid = db.sql("INSERT INTO hall_ticket_queries (hall_ticket_id, reg_no, message) VALUES (?, ?, ?) RETURNING id")
                .params(ticketId, me.regNo(), msg).query(Long.class).single();
        notifications.notify(Audience.COE, me.deptKey(), null, "Hall ticket query",
                me.name() + " (" + me.regNo() + ") reported a hall ticket mistake: " + clip(msg, 120), "hall-tickets");
        return queriesWhere("q.id = ?", qid).get(0);
    }

    @GetMapping("/api/student/hall-tickets/queries")
    List<QueryView> myQueries() {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        return queriesWhere("q.reg_no = ?", me.regNo());
    }

    // ================================================================ rules

    private CurrentUser admin() {
        return ErpSupport.require(Role.ADMIN, Role.SUPER_ADMIN);
    }

    private Cohort cohort(CohortRequest req, boolean needDept) {
        if (req == null) throw ApiException.badRequest("Choose the cohort");
        return cohort(req.academicYear(), req.batch(), firstNonBlank(req.departmentKey(), req.deptKey()), req.yearLabel(), req.semester(), needDept);
    }

    private Cohort cohort(String ay, String batch, String dept, String yearLabel, Integer semester, boolean needDept) {
        String a = blank(ay), b = blank(batch);
        if (a == null || b == null) throw ApiException.badRequest("Enter the academic year and the batch");
        if (!a.replace(" ", "").matches("\\d{4}-\\d{2,4}") || !b.replace(" ", "").matches("\\d{4}-\\d{2,4}")) {
            throw ApiException.badRequest("Write the academic year and batch like 2026-2027 and 2026-2030");
        }
        String d = blank(dept) == null ? "" : deptInCollege(dept);
        if (needDept && (d.isEmpty() || semester == null)) throw ApiException.badRequest("Choose the department and the semester");
        return new Cohort(departments.college(), a.replace(" ", ""), b.replace(" ", ""), d, blank(yearLabel) == null ? "" : yearLabel.trim(),
                semester == null ? 0 : semester);
    }

    private String dept(TemplateRef r) {
        return firstNonBlank(r.deptKey(), r.departmentKey());
    }

    private String deptInCollege(String dept) {
        String d = departments.key(dept);
        int n = db.sql("SELECT count(*) FROM departments WHERE dept_key = ? AND college_key = ?").params(d, departments.college())
                .query(Integer.class).single();
        if (n == 0) throw new ApiException(HttpStatus.FORBIDDEN, "This department is of another college");
        return d;
    }

    private List<Map<String, Object>> students(String dept, String yearLabel, Integer semester) {
        return db.sql("""
                        SELECT reg_no, name, dob, semester, section, year_label FROM students
                        WHERE dept_key = ? AND (CAST(? AS SMALLINT) IS NULL OR semester = ?) AND (CAST(? AS VARCHAR) IS NULL OR year_label = ?)
                        ORDER BY reg_no
                        """).params(dept, semester, semester, yearLabel, yearLabel).query().listOfRows();
    }

    /** The semester's subjects, then the arrears: subjects failed in a published result and not passed since. */
    private List<Map<String, Object>> papersOf(String reg, String dept, int semester) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map<String, Object> s : db.sql("SELECT code, title FROM subjects WHERE dept_key = ? AND semester = ? ORDER BY code")
                .params(dept, semester).query().listOfRows()) {
            out.add(paper(out.size() + 1, (String) s.get("code"), (String) s.get("title"), roman(semester), "CURRENT"));
        }
        for (Map<String, Object> a : db.sql("""
                        SELECT b.subject_code, max(b.subject_title) AS title, max(b.semester) AS semester
                        FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                        WHERE r.reg_no = ? AND b.status = 'PUBLISHED' AND b.semester <> ?
                        GROUP BY b.subject_code HAVING bool_or(r.passed) = FALSE ORDER BY 3, 1
                        """).params(reg, semester).query().listOfRows()) {
            out.add(paper(out.size() + 1, (String) a.get("subject_code"), (String) a.get("title"),
                    roman(((Number) a.get("semester")).intValue()), "ARREAR"));
        }
        return out;
    }

    private static Map<String, Object> paper(int sno, String code, String title, String sem, String type) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("sno", sno);
        p.put("subjectCode", code);
        p.put("subjectTitle", title);
        p.put("paperSemester", sem);
        p.put("paperType", type);
        p.put("isActive", true);
        p.put("examDate", null);
        p.put("session", null);
        p.put("examType", "THEORY");
        return p;
    }

    /** Students whose ticket is held back: not eligible for the exam (attendance) or exam fee unpaid. */
    private Map<String, String> heldBack(Cohort c) {
        Map<String, String> held = new HashMap<>();
        for (var s : eligibility.evaluate(c.dept(), c.yearLabel().isEmpty() ? null : c.yearLabel(), c.semester())) {
            if ("NOT_ELIGIBLE".equals(s.effectiveStatus())) held.put(s.regNo(), "Not eligible (attendance)");
        }
        for (String reg : db.sql("""
                        SELECT DISTINCT d.reg_no FROM fee_demands d JOIN fee_heads h ON h.id = d.head_id JOIN students s ON s.reg_no = d.reg_no
                        WHERE h.category = 'EXAM' AND d.amount - d.concession - d.paid > 0 AND s.dept_key = ? AND s.semester = ?
                        """).params(c.dept(), c.semester()).query(String.class).list()) {
            held.putIfAbsent(reg, "Exam fee unpaid");
        }
        return held;
    }

    private Map<String, Object> reviewOf(Cohort c) {
        Map<String, Object> t = fixedTemplate(c);
        int version = t == null ? 0 : ((Number) t.get("version")).intValue();
        Map<String, Object> rev = db.sql("""
                        SELECT template_version, reviewed_by, reviewed_at FROM hall_ticket_reviews
                        WHERE college_key = ? AND academic_year = ? AND batch = ? AND dept_key = ? AND semester = ?
                        """).params(c.college(), c.academicYear(), c.batch(), c.dept(), c.semester()).query().listOfRows()
                .stream().findFirst().orElse(null);
        Map<String, String> held = heldBack(c);
        List<Map<String, Object>> tickets = new ArrayList<>();
        int blocking = 0, withdrawn = 0;
        for (Map<String, Object> r : db.sql("""
                        SELECT t.id, t.reg_no, s.name, t.status, t.template_version, t.exam_centre, t.papers
                        FROM hall_tickets t JOIN students s ON s.reg_no = t.reg_no
                        WHERE t.college_key = ? AND t.academic_year = ? AND t.batch = ? AND t.dept_key = ? AND t.semester = ? ORDER BY t.reg_no
                        """).params(c.college(), c.academicYear(), c.batch(), c.dept(), c.semester()).query().listOfRows()) {
            List<String> issues = new ArrayList<>();
            List<Map<String, Object>> papers = readList(r.get("papers"));
            long active = papers.stream().filter(p -> !Boolean.FALSE.equals(p.get("isActive"))).count();
            String status = (String) r.get("status");
            if ("WITHDRAWN".equals(status)) {
                withdrawn++;
            } else {
                if (active == 0) issues.add("No papers");
                if (blank(str(r.get("exam_centre"))) == null) issues.add("No examination centre");
                if (version > 0 && ((Number) r.get("template_version")).intValue() != version && !"PUBLISHED".equals(status)) {
                    issues.add("Made from an older template version: generate again");
                }
            }
            blocking += issues.size();
            String note = held.get((String) r.get("reg_no"));
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ticketId", r.get("id"));
            m.put("regNo", r.get("reg_no"));
            m.put("studentName", r.get("name"));
            m.put("status", note != null && "GENERATED".equals(status) ? "GENERATED (" + note + ")" : status);
            m.put("templateVersion", r.get("template_version"));
            m.put("examCentre", r.get("exam_centre"));
            m.put("paperCount", active);
            m.put("blockingIssues", issues);
            tickets.add(m);
        }
        boolean reviewed = rev != null && ((Number) rev.get("template_version")).intValue() == version;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("reviewed", reviewed);
        out.put("reviewedBy", rev == null ? null : rev.get("reviewed_by"));
        out.put("reviewedAt", rev == null ? null : rev.get("reviewed_at").toString());
        out.put("templateVersion", version);
        out.put("tickets", tickets);
        out.put("canPublish", reviewed && blocking == 0 && !tickets.isEmpty());
        out.put("blockingCount", blocking);
        out.put("withdrawnCount", withdrawn);
        return out;
    }

    private Map<String, Object> findTemplate(Cohort c, String name) {
        return db.sql("""
                        SELECT * FROM hall_ticket_templates WHERE college_key = ? AND academic_year = ? AND batch = ? AND dept_key = ?
                          AND year_label = ? AND semester = ? AND (CAST(? AS VARCHAR) IS NULL OR template_name = ?)
                        ORDER BY updated_at DESC LIMIT 1
                        """).params(c.college(), c.academicYear(), c.batch(), c.dept(), c.yearLabel(), c.semester(), name, name)
                .query().listOfRows().stream().findFirst().orElse(null);
    }

    /** The fixed template of the cohort (also one fixed for the whole year/batch when none is made for the class). */
    private Map<String, Object> fixedTemplate(Cohort c) {
        return db.sql("""
                        SELECT * FROM hall_ticket_templates WHERE college_key = ? AND academic_year = ? AND batch = ? AND status = 'FIXED'
                          AND dept_key IN (?, '') AND year_label IN (?, '') AND semester IN (?, 0)
                        ORDER BY (dept_key = '') , (semester = 0), (year_label = ''), updated_at DESC LIMIT 1
                        """).params(c.college(), c.academicYear(), c.batch(), c.dept(), c.yearLabel(), c.semester())
                .query().listOfRows().stream().findFirst().orElse(null);
    }

    private Map<String, Object> resolve(TemplateRef req, boolean mustExist) {
        if (req.templateId() != null) return templateRow(req.templateId());
        Cohort c = cohort(req.academicYear(), req.batch(), dept(req), req.yearLabel(), req.semester(), false);
        Map<String, Object> row = findTemplate(c, blank(req.templateName()));
        if (row == null && mustExist) throw ApiException.badRequest("Save the template first");
        return row;
    }

    private Map<String, Object> templateRow(long id) {
        return db.sql("SELECT * FROM hall_ticket_templates WHERE id = ? AND college_key = ?").params(id, departments.college())
                .query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("Template not found"));
    }

    private long insertTemplate(Cohort c, String name, Map<String, Object> body, String by) {
        return db.sql("""
                        INSERT INTO hall_ticket_templates (college_key, academic_year, batch, template_name, dept_key, year_label, semester,
                                                           body, updated_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSONB), ?) RETURNING id
                        """).params(c.college(), c.academicYear(), c.batch(), name, c.dept(), c.yearLabel(), c.semester(), write(body), by)
                .query(Long.class).single();
    }

    private Map<String, Object> copyInto(Cohort c, Map<String, Object> body, CurrentUser me) {
        Map<String, Object> row = findTemplate(c, "Reference");
        if (row == null) return templateView(templateRow(insertTemplate(c, "Reference", body, me.name())));
        if ("FIXED".equals(row.get("status"))) throw ApiException.conflict("The template is fixed. Unfix it to replace it.");
        long id = ((Number) row.get("id")).longValue();
        db.sql("UPDATE hall_ticket_templates SET body = CAST(? AS JSONB), updated_by = ?, updated_at = now() WHERE id = ?")
                .params(write(body), me.name(), id).update();
        return templateView(templateRow(id));
    }

    private Map<String, Object> defaults(Cohort c) {
        String collegeName = switch (c.college()) {
            case "nursing" -> "KVELL College of Nursing";
            case "pharmacy" -> "KVELL College of Pharmacy";
            default -> "KVELL Faculty of Engineering";
        };
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("examTitle", "END SEMESTER EXAMINATIONS " + c.academicYear());
        b.put("examinationCentre", collegeName);
        b.put("notes", List.of(
                "Bring this hall ticket and your college identity card to every examination.",
                "Be seated in the examination hall 15 minutes before the start.",
                "Mobile phones, smart watches and other electronic devices are not allowed in the hall.",
                "Any malpractice will be dealt with as per the university regulations."));
        b.put("sigCandidate", "Signature of the Candidate");
        b.put("sigCoe", "Controller of Examinations");
        b.put("sigPrincipal", "Principal");
        b.put("showPhoto", true);
        b.put("photoPosition", "right");
        b.put("photoSize", "medium");
        b.put("logoSource", "both");
        b.put("logoImage", null);
        b.put("logoMime", null);
        b.put("backgroundImage", null);
        b.put("backgroundMime", null);
        b.put("layoutJson", null);
        return b;
    }

    private Map<String, Object> referenceView(Cohort c, String name) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", null);
        v.put("collegeKey", c.college());
        v.put("academicYear", c.academicYear());
        v.put("batch", c.batch());
        v.put("templateName", name);
        v.put("deptKey", c.dept().isEmpty() ? null : c.dept());
        v.put("yearLabel", c.yearLabel().isEmpty() ? null : c.yearLabel());
        v.put("semester", c.semester() == 0 ? null : c.semester());
        v.putAll(defaults(c));
        v.put("status", "DRAFT");
        v.put("version", 0);
        return v;
    }

    private Map<String, Object> templateView(Map<String, Object> row) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("id", row.get("id"));
        v.put("collegeKey", row.get("college_key"));
        v.put("academicYear", row.get("academic_year"));
        v.put("batch", row.get("batch"));
        v.put("templateName", row.get("template_name"));
        v.put("deptKey", emptyToNull(row.get("dept_key")));
        v.put("yearLabel", emptyToNull(row.get("year_label")));
        int sem = ((Number) row.get("semester")).intValue();
        v.put("semester", sem == 0 ? null : sem);
        v.putAll(read(row.get("body")));
        v.put("status", row.get("status"));
        v.put("version", row.get("version"));
        v.put("fixedBy", row.get("fixed_by"));
        v.put("fixedAt", row.get("fixed_at") == null ? null : row.get("fixed_at").toString());
        v.put("updatedBy", row.get("updated_by"));
        v.put("updatedAt", row.get("updated_at") == null ? null : row.get("updated_at").toString());
        return v;
    }

    private Map<String, Object> ticket(long id) {
        return db.sql("SELECT * FROM hall_tickets WHERE id = ? AND college_key = ?").params(id, departments.college())
                .query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("Hall ticket not found"));
    }

    private Map<String, Object> latestPublished(String reg) {
        return db.sql("SELECT * FROM hall_tickets WHERE reg_no = ? AND status = 'PUBLISHED' ORDER BY published_at DESC LIMIT 1")
                .param(reg).query().listOfRows().stream().findFirst().orElse(null);
    }

    private List<TicketView> ticketsWhere(String where, Object... params) {
        return db.sql("""
                        SELECT t.id, t.reg_no, s.name, t.dept_key, d.name, t.semester, s.section, t.exam_title, t.hall_ticket_no, t.status,
                               t.published_by, t.published_at, t.created_at, t.withdrawn_by, t.withdrawn_at, t.withdraw_reason,
                               t.restored_by, t.restored_at,
                               NOT EXISTS (SELECT 1 FROM fee_demands f JOIN fee_heads h ON h.id = f.head_id WHERE f.reg_no = t.reg_no
                                           AND h.category = 'EXAM' AND f.amount - f.concession - f.paid > 0) AS fee_paid
                        FROM hall_tickets t JOIN students s ON s.reg_no = t.reg_no JOIN departments d ON d.dept_key = t.dept_key
                        WHERE""" + " " + where + " ORDER BY t.dept_key, t.semester, t.reg_no")
                .params(params)
                .query((rs, n) -> new TicketView(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getInt(6), rs.getString(7), 0, rs.getString(8), rs.getString(9), rs.getString(10), rs.getBoolean(19),
                        rs.getString(11), ts(rs.getObject(12, OffsetDateTime.class)), ts(rs.getObject(13, OffsetDateTime.class)),
                        rs.getString(14), ts(rs.getObject(15, OffsetDateTime.class)), rs.getString(16), rs.getString(17),
                        ts(rs.getObject(18, OffsetDateTime.class))))
                .list();
    }

    private List<QueryView> queriesWhere(String where, Object... params) {
        return db.sql("""
                        SELECT q.id, q.hall_ticket_id, q.reg_no, s.name, q.message, q.status, q.coe_response, q.responded_by,
                               q.responded_at, q.created_at
                        FROM hall_ticket_queries q JOIN hall_tickets t ON t.id = q.hall_ticket_id JOIN students s ON s.reg_no = q.reg_no
                        WHERE""" + " " + where + " ORDER BY (q.status = 'OPEN') DESC, q.created_at DESC")
                .params(params)
                .query((rs, n) -> new QueryView(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), rs.getString(7), rs.getString(8), ts(rs.getObject(9, OffsetDateTime.class)),
                        ts(rs.getObject(10, OffsetDateTime.class))))
                .list();
    }

    private java.util.Optional<Long> studentUser(String reg) {
        return db.sql("SELECT id FROM users WHERE reg_no = ? LIMIT 1").param(reg).query(Long.class).optional();
    }

    private Map<String, Object> read(Object body) {
        if (body == null) return new LinkedHashMap<>();
        return json.readValue(body.toString(), new TypeReference<LinkedHashMap<String, Object>>() { });
    }

    private List<Map<String, Object>> readList(Object body) {
        if (body == null) return List.of();
        return json.readValue(body.toString(), new TypeReference<List<Map<String, Object>>>() { });
    }

    private String write(Object o) {
        return json.writeValueAsString(o);
    }

    private static Map<String, Object> merge(Map<String, Object> base, Map<String, Object> over) {
        Map<String, Object> m = new LinkedHashMap<>(base);
        m.putAll(over);
        return m;
    }

    static String ticketNo(String ay, int semester, String reg) {
        String y = ay == null ? "" : ay.replaceAll("[^0-9]", "");
        return "HT" + (y.length() >= 4 ? y.substring(2, 4) : "") + String.format("%02d", semester) + reg;
    }

    private static String degree(String deptName) {
        return "B.E. / B.Tech. – " + deptName;
    }

    private static String roman(int n) {
        String[] r = {"", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"};
        return n >= 1 && n <= 8 ? r[n] : String.valueOf(n);
    }

    private static String dob(Object d) {
        return d == null ? "" : ((java.sql.Date) d).toLocalDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
    }

    private static String ts(OffsetDateTime t) {
        return t == null ? null : t.toString();
    }

    private static Object emptyToNull(Object o) {
        return o == null || o.toString().isEmpty() ? null : o;
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }

    private static String blank(String s) {
        return s == null || s.isBlank() || "ALL".equalsIgnoreCase(s.trim()) ? null : s.trim();
    }

    private static String firstNonBlank(String a, String b) {
        return blank(a) != null ? a : b;
    }

    private static String clip(String s, int max) {
        return s == null ? "" : s.length() > max ? s.substring(0, max) : s;
    }

    @SuppressWarnings("unused")
    private static String join(List<String> l) {
        return l.stream().collect(Collectors.joining(", "));
    }
}
