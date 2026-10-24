package edu.kvell.results.halls;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Examination hall allotment (requirements REQ-06/07/08/09). The COE builds the seating plan of an examination
 * session (halls and benches, filled department by department in turn) and publishes it with a seal (a SHA-256 of
 * the seats). The allotment then cascades: the Associate Dean oversees it read-only, each HOD validates their
 * department's seats, the department's faculty publish them, and only then do the students see their seating card
 * (hall, bench, session, reporting time). During the examination the COE can grant a hall extra minutes after a
 * disruption; the students' card shows the new end time.
 */
@RestController
public class HallAllotmentController {

    public record HallInput(String name, Integer capacity) {
    }

    public record PlanInput(String title, String semester, String assessmentType, String examDate, String session,
                            String startTime, Integer durationMinutes, Integer reportingMinutes, List<String> depts,
                            List<HallInput> halls) {
    }

    public record DeptStep(String deptKey, String deptName, int students, String hodValidatedBy,
                           OffsetDateTime hodValidatedAt, String facultyPublishedBy, OffsetDateTime facultyPublishedAt) {
    }

    public record HallSummary(String hall, int students, int extraMinutes, String extensionReason) {
    }

    public record Plan(long id, String title, String semester, String assessmentType, LocalDate examDate,
                       String session, LocalTime startTime, int durationMinutes, int reportingMinutes, String status,
                       String seal, String createdBy, String publishedBy, OffsetDateTime publishedAt,
                       List<DeptStep> departments, List<HallSummary> halls) {
    }

    public record Seat(String hall, String bench, String regNo, String name, String deptKey) {
    }

    public record ExtensionInput(String hall, Integer extraMinutes, String reason) {
    }

    /** The student's seating card. */
    public record SeatingCard(long planId, String title, String semester, String assessmentType, LocalDate examDate,
                              String session, LocalTime reportingTime, LocalTime startTime, LocalTime endTime,
                              int durationMinutes, int extraMinutes, String extensionReason, String hall,
                              String bench, String publishedBy) {
    }

    private static final Set<String> ASSESSMENTS = Set.of("IAT-1", "IAT-2", "End Semester");

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;

    public HallAllotmentController(JdbcClient db, Departments departments, AuditService audit) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
    }

    // ------------------------------------------------------------------------------------------------ the COE

    @GetMapping("/api/admin/hall-plans")
    List<Plan> coePlans() {
        return plans(false, null);
    }

    @GetMapping({"/api/admin/hall-plans/{id}/seats", "/api/dean/hall-plans/{id}/seats"})
    List<Seat> seats(@PathVariable long id) {
        plan(id);
        return seatsOf(id, null);
    }

    @PostMapping("/api/admin/hall-plans")
    @Transactional
    Plan create(@RequestBody PlanInput in, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        if (in == null) throw ApiException.badRequest("Plan details are required");
        String title = in.title() == null || in.title().isBlank() ? "Examination hall allotment" : in.title().trim();
        if (title.length() > 160) throw ApiException.badRequest("Title is too long");
        int sem = Semesters.parse(in.semester());
        String assessment = in.assessmentType() == null ? "" : in.assessmentType().trim();
        if (!ASSESSMENTS.contains(assessment)) throw ApiException.badRequest("Choose IAT-1, IAT-2 or End Semester");
        LocalDate date;
        LocalTime start;
        try {
            date = LocalDate.parse(in.examDate());
            start = LocalTime.parse(in.startTime());
        } catch (Exception e) {
            throw ApiException.badRequest("Give the examination date (yyyy-mm-dd) and start time (hh:mm)");
        }
        String session = in.session() == null ? "" : in.session().trim().toUpperCase(Locale.ROOT);
        if (!session.equals("FN") && !session.equals("AN")) throw ApiException.badRequest("Session must be FN or AN");
        int duration = in.durationMinutes() == null ? 180 : in.durationMinutes();
        int reporting = in.reportingMinutes() == null ? 30 : in.reportingMinutes();
        if (duration < 30 || duration > 360) throw ApiException.badRequest("Duration: 30 to 360 minutes");
        if (reporting < 0 || reporting > 120) throw ApiException.badRequest("Reporting time: 0 to 120 minutes before");
        if (in.depts() == null || in.depts().isEmpty()) throw ApiException.badRequest("Choose the departments");
        List<String> depts = in.depts().stream().map(departments::key).distinct().toList();
        if (in.halls() == null || in.halls().isEmpty()) throw ApiException.badRequest("Add the examination halls");
        List<HallInput> halls = new ArrayList<>();
        Set<String> names = new java.util.HashSet<>();
        for (HallInput h : in.halls()) {
            String name = h == null || h.name() == null ? "" : h.name().trim();
            int cap = h == null || h.capacity() == null ? 40 : h.capacity();
            if (name.isEmpty() || name.length() > 40) throw ApiException.badRequest("Each hall needs a name (up to 40 characters)");
            if (cap < 1 || cap > 300) throw ApiException.badRequest("Hall " + name + ": capacity 1 to 300");
            if (!names.add(name.toUpperCase(Locale.ROOT))) throw ApiException.badRequest("Hall " + name + " is listed twice");
            halls.add(new HallInput(name, cap));
        }

        // Students of each department in register order, then taken in turn (one from each department) so that
        // neighbours on a bench row are from different departments
        Map<String, List<String>> byDept = new LinkedHashMap<>();
        for (String d : depts) {
            byDept.put(d, db.sql("SELECT reg_no FROM students WHERE dept_key = ? AND semester = ? ORDER BY reg_no")
                    .params(d, sem).query(String.class).list());
        }
        List<String[]> order = new ArrayList<>();
        int longest = byDept.values().stream().mapToInt(List::size).max().orElse(0);
        for (int i = 0; i < longest; i++) {
            for (var e : byDept.entrySet()) if (i < e.getValue().size()) order.add(new String[] {e.getValue().get(i), e.getKey()});
        }
        if (order.isEmpty()) throw ApiException.badRequest("No students in these departments in " + Semesters.label(sem));
        int capacity = halls.stream().mapToInt(HallInput::capacity).sum();
        if (capacity < order.size()) {
            throw ApiException.badRequest("The halls seat " + capacity + " but " + order.size()
                    + " students write this examination; add halls or seats");
        }

        long id = db.sql("""
                        INSERT INTO hall_plans (college_key, title, semester, assessment_type, exam_date, session,
                            start_time, duration_minutes, reporting_minutes, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                        """).params(departments.college(), title, sem, assessment, date, session, start, duration,
                        reporting, user.name())
                .query(Long.class).single();
        int next = 0;
        for (HallInput h : halls) {
            for (int b = 1; b <= h.capacity() && next < order.size(); b++, next++) {
                db.sql("INSERT INTO hall_plan_seats (plan_id, hall, bench, reg_no, dept_key) VALUES (?, ?, ?, ?, ?)")
                        .params(id, h.name(), String.format("B%02d", b), order.get(next)[0], order.get(next)[1]).update();
            }
        }
        for (String d : depts) {
            db.sql("INSERT INTO hall_plan_depts (plan_id, dept_key) VALUES (?, ?)").params(id, d).update();
        }
        audit.record(user.username(), user.name(), "CREATED_HALL_PLAN", String.valueOf(id),
                "Allotted " + order.size() + " students to " + halls.size() + " halls for " + title + " (" + date + " "
                        + session + ").", http.getRemoteAddr());
        return plan(id);
    }

    /** The COE finalises and publishes the plan; the seal fixes the seats (any later change would not match it). */
    @PostMapping("/api/admin/hall-plans/{id}/publish")
    @Transactional
    Plan publish(@PathVariable long id, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        Plan p = plan(id);
        if ("PUBLISHED".equals(p.status())) throw ApiException.conflict("This plan is already published");
        StringBuilder text = new StringBuilder(p.id() + "|" + p.examDate() + "|" + p.session());
        seatsOf(id, null).forEach(s -> text.append('|').append(s.hall()).append(':').append(s.bench()).append(':').append(s.regNo()));
        String seal;
        try {
            seal = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
        db.sql("UPDATE hall_plans SET status = 'PUBLISHED', seal = ?, published_by = ?, published_at = now() WHERE id = ?")
                .params(seal, user.name(), id).update();
        audit.record(user.username(), user.name(), "PUBLISHED_HALL_PLAN", String.valueOf(id),
                "Published the hall allotment " + p.title() + " (seal " + seal.substring(0, 12) + ").", http.getRemoteAddr());
        return plan(id);
    }

    @DeleteMapping("/api/admin/hall-plans/{id}")
    @Transactional
    Map<String, Boolean> delete(@PathVariable long id, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        Plan p = plan(id);
        if ("PUBLISHED".equals(p.status())) throw ApiException.conflict("A published plan cannot be deleted");
        db.sql("DELETE FROM hall_plans WHERE id = ?").param(id).update();
        audit.record(user.username(), user.name(), "DELETED_HALL_PLAN", String.valueOf(id),
                "Deleted the draft hall allotment " + p.title() + ".", http.getRemoteAddr());
        return Map.of("deleted", true);
    }

    /** REQ-09: extra minutes for one hall after a disruption (0 removes the extension). */
    @PutMapping("/api/admin/hall-plans/{id}/extension")
    @Transactional
    Plan extend(@PathVariable long id, @RequestBody ExtensionInput in, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        Plan p = plan(id);
        if (!"PUBLISHED".equals(p.status())) throw ApiException.badRequest("Publish the plan first");
        if (in == null || in.hall() == null || in.extraMinutes() == null) throw ApiException.badRequest("Choose the hall and minutes");
        if (in.extraMinutes() < 0 || in.extraMinutes() > 120) throw ApiException.badRequest("Extra time: 0 to 120 minutes");
        if (p.halls().stream().noneMatch(h -> h.hall().equals(in.hall()))) throw ApiException.badRequest("Unknown hall " + in.hall());
        String reason = in.reason() == null ? "" : in.reason().trim();
        if (in.extraMinutes() > 0 && reason.length() < 3) throw ApiException.badRequest("Give the reason for the extra time");
        if (reason.length() > 300) throw ApiException.badRequest("Reason: at most 300 characters");
        if (in.extraMinutes() == 0) {
            db.sql("DELETE FROM hall_extensions WHERE plan_id = ? AND hall = ?").params(id, in.hall()).update();
        } else {
            db.sql("""
                            INSERT INTO hall_extensions (plan_id, hall, extra_minutes, reason, set_by) VALUES (?, ?, ?, ?, ?)
                            ON CONFLICT (plan_id, hall) DO UPDATE SET extra_minutes = EXCLUDED.extra_minutes,
                                reason = EXCLUDED.reason, set_by = EXCLUDED.set_by, set_at = now()
                            """).params(id, in.hall(), in.extraMinutes(), reason, user.name()).update();
        }
        audit.record(user.username(), user.name(), "HALL_TIME_EXTENSION", p.title() + " " + in.hall(),
                "Granted hall " + in.hall() + " " + in.extraMinutes() + " extra minutes" + (reason.isEmpty() ? "." : ": " + reason),
                http.getRemoteAddr());
        return plan(id);
    }

    // ------------------------------------------------------------ the Associate Dean (read-only), HOD and faculty

    @GetMapping("/api/dean/hall-plans")
    List<Plan> deanPlans() {
        return plans(true, null);
    }

    /** The HOD's and faculty's view: published plans with their department, and their department's seats. */
    @GetMapping({"/api/hod/hall-plans", "/api/faculty/hall-plans"})
    List<Plan> deptPlans() {
        return plans(true, CurrentUser.get().deptKey());
    }

    @GetMapping({"/api/hod/hall-plans/{id}/seats", "/api/faculty/hall-plans/{id}/seats"})
    List<Seat> deptSeats(@PathVariable long id) {
        plan(id);
        return seatsOf(id, CurrentUser.get().deptKey());
    }

    @PostMapping("/api/hod/hall-plans/{id}/validate")
    @Transactional
    Plan validate(@PathVariable long id, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        DeptStep step = step(id, user.deptKey());
        if (step.hodValidatedAt() != null) throw ApiException.conflict("Already validated");
        db.sql("UPDATE hall_plan_depts SET hod_validated_by = ?, hod_validated_at = now() WHERE plan_id = ? AND dept_key = ?")
                .params(user.name(), id, user.deptKey()).update();
        audit.record(user.username(), user.name(), "VALIDATED_HALL_PLAN", String.valueOf(id),
                "Validated the hall allotment for " + user.deptKey().toUpperCase(Locale.ROOT) + " and sent it to the faculty.",
                http.getRemoteAddr());
        return plan(id);
    }

    @PostMapping("/api/faculty/hall-plans/{id}/publish")
    @Transactional
    Plan facultyPublish(@PathVariable long id, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        DeptStep step = step(id, user.deptKey());
        if (step.hodValidatedAt() == null) throw ApiException.conflict("The HOD has not validated this allotment yet");
        if (step.facultyPublishedAt() != null) throw ApiException.conflict("Already published to the students");
        db.sql("UPDATE hall_plan_depts SET faculty_published_by = ?, faculty_published_at = now() WHERE plan_id = ? AND dept_key = ?")
                .params(user.name(), id, user.deptKey()).update();
        audit.record(user.username(), user.name(), "PUBLISHED_SEATING_TO_STUDENTS", String.valueOf(id),
                "Published the seating of " + user.deptKey().toUpperCase(Locale.ROOT) + " to the students.", http.getRemoteAddr());
        return plan(id);
    }

    // ------------------------------------------------------------------------------------------------ students

    @GetMapping("/api/student/seating")
    List<SeatingCard> seating() {
        String reg = CurrentUser.get().regNo();
        return db.sql("""
                        SELECT p.*, s.hall, s.bench, coalesce(x.extra_minutes, 0) AS extra, x.reason AS ext_reason
                        FROM hall_plan_seats s JOIN hall_plans p ON p.id = s.plan_id
                        JOIN hall_plan_depts d ON d.plan_id = p.id AND d.dept_key = s.dept_key
                        LEFT JOIN hall_extensions x ON x.plan_id = p.id AND x.hall = s.hall
                        WHERE s.reg_no = ? AND p.status = 'PUBLISHED' AND d.faculty_published_at IS NOT NULL
                          AND p.exam_date >= current_date - 1
                        ORDER BY p.exam_date, p.start_time
                        """).param(reg)
                .query((rs, n) -> {
                    LocalTime start = rs.getObject("start_time", LocalTime.class);
                    int duration = rs.getInt("duration_minutes"), extra = rs.getInt("extra");
                    return new SeatingCard(rs.getLong("id"), rs.getString("title"), Semesters.label(rs.getInt("semester")),
                            rs.getString("assessment_type"), rs.getObject("exam_date", LocalDate.class),
                            rs.getString("session"), start.minusMinutes(rs.getInt("reporting_minutes")), start,
                            start.plusMinutes(duration + extra), duration, extra, rs.getString("ext_reason"),
                            rs.getString("hall"), rs.getString("bench"), rs.getString("published_by"));
                })
                .list();
    }

    // ------------------------------------------------------------------------------------------------ helpers

    private List<Plan> plans(boolean publishedOnly, String dept) {
        return db.sql("""
                        SELECT p.id FROM hall_plans p
                        WHERE p.college_key = ? AND (? = FALSE OR p.status = 'PUBLISHED')
                          AND (CAST(? AS VARCHAR) IS NULL OR EXISTS
                               (SELECT 1 FROM hall_plan_depts d WHERE d.plan_id = p.id AND d.dept_key = ?))
                        ORDER BY p.exam_date DESC, p.start_time DESC
                        """).params(departments.college(), publishedOnly, dept, dept)
                .query(Long.class).list().stream().map(this::plan).toList();
    }

    private Plan plan(long id) {
        return db.sql("SELECT * FROM hall_plans WHERE id = ? AND college_key = ?").params(id, departments.college())
                .query((rs, n) -> new Plan(rs.getLong("id"), rs.getString("title"), Semesters.label(rs.getInt("semester")),
                        rs.getString("assessment_type"), rs.getObject("exam_date", LocalDate.class), rs.getString("session"),
                        rs.getObject("start_time", LocalTime.class), rs.getInt("duration_minutes"),
                        rs.getInt("reporting_minutes"), rs.getString("status"), rs.getString("seal"),
                        rs.getString("created_by"), rs.getString("published_by"),
                        rs.getObject("published_at", OffsetDateTime.class), steps(id), halls(id)))
                .optional().orElseThrow(() -> ApiException.notFound("Hall allotment not found"));
    }

    private List<DeptStep> steps(long id) {
        return db.sql("""
                        SELECT d.dept_key, dp.name, (SELECT count(*) FROM hall_plan_seats s WHERE s.plan_id = d.plan_id
                                                      AND s.dept_key = d.dept_key) AS students,
                               d.hod_validated_by, d.hod_validated_at, d.faculty_published_by, d.faculty_published_at
                        FROM hall_plan_depts d JOIN departments dp ON dp.dept_key = d.dept_key
                        WHERE d.plan_id = ? ORDER BY dp.name
                        """).param(id)
                .query((rs, n) -> new DeptStep(rs.getString(1), rs.getString(2), rs.getInt(3), rs.getString(4),
                        rs.getObject(5, OffsetDateTime.class), rs.getString(6), rs.getObject(7, OffsetDateTime.class)))
                .list();
    }

    private DeptStep step(long id, String dept) {
        Plan p = plan(id);
        if (!"PUBLISHED".equals(p.status())) throw ApiException.badRequest("The COE has not published this allotment");
        return p.departments().stream().filter(d -> d.deptKey().equals(dept)).findFirst()
                .orElseThrow(() -> ApiException.badRequest("Your department is not in this allotment"));
    }

    private List<HallSummary> halls(long id) {
        return db.sql("""
                        SELECT s.hall, count(*), coalesce(max(x.extra_minutes), 0), max(x.reason)
                        FROM hall_plan_seats s LEFT JOIN hall_extensions x ON x.plan_id = s.plan_id AND x.hall = s.hall
                        WHERE s.plan_id = ? GROUP BY s.hall ORDER BY s.hall
                        """).param(id)
                .query((rs, n) -> new HallSummary(rs.getString(1), rs.getInt(2), rs.getInt(3), rs.getString(4)))
                .list();
    }

    private List<Seat> seatsOf(long id, String dept) {
        return db.sql("""
                        SELECT s.hall, s.bench, s.reg_no, st.name, s.dept_key FROM hall_plan_seats s
                        JOIN students st ON st.reg_no = s.reg_no
                        WHERE s.plan_id = ? AND (CAST(? AS VARCHAR) IS NULL OR s.dept_key = ?)
                        ORDER BY s.hall, s.bench
                        """).params(id, dept, dept)
                .query((rs, n) -> new Seat(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5)))
                .list();
    }
}
