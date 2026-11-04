package edu.kvell.results.erp;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The Accounts office (role ACCOUNTS, in the officers panel): fee heads, fee structures (publishing one raises the dues
 * of every student of that department and year), student dues and ledgers, payments, concessions and refunds
 * (maker-checker: one Accounts user enters, the Accounts head approves; never the same person), receipts and the
 * Tally export. Every fee change is in the audit log. Only students of the Accounts user's college are visible.
 */
@RestController
@RequestMapping("/api/accounts")
public class AccountsController {

    public record Head(long id, String code, String name, String category, boolean active) {
    }

    public record HeadRequest(String code, String name, String category, Boolean active) {
    }

    public record Item(long headId, String head, BigDecimal amount) {
    }

    /** kind ANNUAL: the yearly common fees of a year of study; kind EXAM: the exam fee of one semester's exam session. */
    public record Structure(long id, String kind, String deptKey, String deptName, int studyYear, Integer semester,
                            String examSession, String academicYear, String title, String dueDate, String status,
                            BigDecimal total, int students, List<Item> items) {
    }

    /** The students a structure is for: a year of study (ANNUAL) or one semester (EXAM). */
    private static final String FOR_STUDENTS = """
             JOIN students st ON st.dept_key = f.dept_key
                  AND CASE WHEN f.kind = 'EXAM' THEN st.semester = f.semester ELSE (st.semester + 1) / 2 = f.study_year END
            """;

    /** The heads a structure raises: exam heads only in an EXAM structure; never bus / hostel (they are per student). */
    private static final String RAISED_HEADS = " (f.kind = 'EXAM') = (h.category = 'EXAM') AND h.category NOT IN ('BUS', 'HOSTEL') ";

    public record ItemRequest(Long headId, BigDecimal amount) {
    }

    public record StructureRequest(String kind, String deptKey, Integer studyYear, Integer semester, String examSession,
                                   String academicYear, String title, String dueDate, List<ItemRequest> items) {
    }

    public record StudentDue(String regNo, String name, String deptKey, int semester, String section, BigDecimal amount,
                             BigDecimal concession, BigDecimal paid, BigDecimal balance, BigDecimal overdue) {
    }

    public record Ledger(String regNo, String name, String parentPhone, List<FeeService.Demand> demands,
                         List<FeeService.Payment> payments, FeeService.Clearance clearance) {
    }

    public record Approval(long id, String kind, String regNo, String name, String detail, BigDecimal amount, String reason,
                           String status, String requestedBy, String requestedAt, String decidedBy) {
    }

    public record ConcessionRequest(String regNo, Long demandId, String kind, BigDecimal amount, String reason) {
    }

    public record RefundRequest(Long paymentId, BigDecimal amount, String reason) {
    }

    public record Decision(Boolean approve) {
    }

    public record Dashboard(BigDecimal collectedToday, BigDecimal collectedMonth, BigDecimal outstanding,
                            BigDecimal overdue, int overdueStudents, int pendingApprovals, boolean head, String gateway) {
    }

    private final JdbcClient db;
    private final FeeService fees;
    private final AuditService audit;
    private final NotificationService notifications;

    public AccountsController(JdbcClient db, FeeService fees, AuditService audit, NotificationService notifications) {
        this.db = db;
        this.fees = fees;
        this.audit = audit;
        this.notifications = notifications;
    }

    /** Limits a query to the Accounts user's college (students.dept_key → departments.college_key). */
    private static String college(String deptColumn) {
        return " " + deptColumn + " IN (SELECT dept_key FROM departments WHERE college_key = :college) ";
    }

    private static String collegeKey() {
        String c = CurrentUser.get().collegeKey();
        return c == null ? "engineering" : c;
    }

    @GetMapping("/dashboard")
    Dashboard dashboard() {
        CurrentUser me = CurrentUser.get();
        Map<String, Object> r = db.sql("""
                        SELECT
                          (SELECT coalesce(sum(p.amount), 0) FROM fee_payments p JOIN students s ON s.reg_no = p.reg_no
                           WHERE p.status = 'PAID' AND p.paid_at >= current_date AND""" + college("s.dept_key") + """
                          ) AS today,
                          (SELECT coalesce(sum(p.amount), 0) FROM fee_payments p JOIN students s ON s.reg_no = p.reg_no
                           WHERE p.status = 'PAID' AND p.paid_at >= date_trunc('month', current_date) AND""" + college("s.dept_key") + """
                          ) AS month,
                          (SELECT coalesce(sum(d.amount - d.concession - d.paid), 0) FROM fee_demands d JOIN students s ON s.reg_no = d.reg_no
                           WHERE""" + college("s.dept_key") + """
                          ) AS outstanding,
                          (SELECT coalesce(sum(d.amount - d.concession - d.paid), 0) FROM fee_demands d JOIN students s ON s.reg_no = d.reg_no
                           WHERE d.due_date < current_date AND""" + college("s.dept_key") + """
                          ) AS overdue,
                          (SELECT count(DISTINCT d.reg_no) FROM fee_demands d JOIN students s ON s.reg_no = d.reg_no
                           WHERE d.due_date < current_date AND d.amount - d.concession - d.paid > 0 AND""" + college("s.dept_key") + """
                          ) AS overdue_students,
                          (SELECT count(*) FROM fee_concessions c JOIN students s ON s.reg_no = c.reg_no
                           WHERE c.status = 'PENDING' AND""" + college("s.dept_key") + """
                          ) + (SELECT count(*) FROM fee_refunds r JOIN students s ON s.reg_no = r.reg_no
                           WHERE r.status = 'PENDING' AND""" + college("s.dept_key") + """
                          ) AS pending
                        """).param("college", collegeKey()).query().singleRow();
        return new Dashboard((BigDecimal) r.get("today"), (BigDecimal) r.get("month"), (BigDecimal) r.get("outstanding"),
                (BigDecimal) r.get("overdue"), ((Number) r.get("overdue_students")).intValue(),
                ((Number) r.get("pending")).intValue(), head(me), fees.razorpay() ? "Razorpay" : fees.testGateway() ? "Test gateway (local)" : "Not set up");
    }

    public record Dept(String key, String name, String code) {
    }

    @GetMapping("/departments")
    List<Dept> departments() {
        return db.sql("SELECT dept_key, name, coalesce(code, upper(dept_key)) FROM departments WHERE college_key = ? ORDER BY name")
                .param(collegeKey()).query((rs, n) -> new Dept(rs.getString(1), rs.getString(2), rs.getString(3))).list();
    }

    // ---------------------------------------------------------------- fee heads

    @GetMapping("/fee-heads")
    List<Head> heads() {
        return db.sql("SELECT id, code, name, category, active FROM fee_heads ORDER BY code")
                .query((rs, n) -> new Head(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getBoolean(5))).list();
    }

    @PostMapping("/fee-heads")
    Head addHead(@RequestBody HeadRequest req, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        String code = LogbookController.text(req.code(), "Code", 20).toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]", "_");
        String name = LogbookController.text(req.name(), "Name", 120);
        String category = category(req.category());
        long id = db.sql("INSERT INTO fee_heads (code, name, category) VALUES (?, ?, ?) ON CONFLICT (code) DO NOTHING RETURNING id")
                .params(code, name, category).query(Long.class).optional()
                .orElseThrow(() -> ApiException.conflict("A fee head " + code + " already exists"));
        audit.record(me.username(), me.name(), "ADDED_FEE_HEAD", code, "Added the fee head " + code + " (" + name + ").", http.getRemoteAddr());
        return heads().stream().filter(h -> h.id() == id).findFirst().orElseThrow();
    }

    @PutMapping("/fee-heads/{id}")
    Head editHead(@PathVariable long id, @RequestBody HeadRequest req, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        String name = LogbookController.text(req.name(), "Name", 120);
        // BUS and HOSTEL carry the per-student route / room fees: their category is fixed
        int n = db.sql("""
                        UPDATE fee_heads SET name = ?, category = CASE WHEN code IN ('BUS', 'HOSTEL') THEN category ELSE ? END, active = ?
                        WHERE id = ?
                        """).params(name, category(req.category()), req.active() == null || req.active(), id).update();
        if (n == 0) throw ApiException.notFound("Fee head not found");
        audit.record(me.username(), me.name(), "EDITED_FEE_HEAD", String.valueOf(id), "Edited the fee head " + name + ".", http.getRemoteAddr());
        return heads().stream().filter(h -> h.id() == id).findFirst().orElseThrow();
    }

    /** Only a head that no structure or due uses can be deleted; otherwise it can be deactivated. */
    @org.springframework.web.bind.annotation.DeleteMapping("/fee-heads/{id}")
    Map<String, String> deleteHead(@PathVariable long id, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        Head h = heads().stream().filter(x -> x.id() == id).findFirst().orElseThrow(() -> ApiException.notFound("Fee head not found"));
        if (List.of("BUS", "HOSTEL").contains(h.code())) throw ApiException.conflict(h.name() + " is used for the bus and hostel fees and cannot be deleted");
        boolean used = db.sql("""
                        SELECT EXISTS (SELECT 1 FROM fee_structure_items WHERE head_id = ?) OR EXISTS (SELECT 1 FROM fee_demands WHERE head_id = ?)
                        """).params(id, id).query(Boolean.class).single();
        if (used) throw ApiException.conflict(h.name() + " is used in a fee structure or in students' dues; deactivate it instead");
        db.sql("DELETE FROM fee_heads WHERE id = ?").param(id).update();
        audit.record(me.username(), me.name(), "DELETED_FEE_HEAD", h.code(), "Deleted the fee head " + h.code() + " (" + h.name() + ").",
                http.getRemoteAddr());
        return Map.of("status", "deleted");
    }

    // ---------------------------------------------------------------- fee structures

    @GetMapping("/fee-structures")
    List<Structure> structures() {
        return db.sql("""
                        SELECT f.*, d.name AS dept_name,
                               (SELECT coalesce(sum(i.amount), 0) FROM fee_structure_items i JOIN fee_heads h ON h.id = i.head_id
                                WHERE i.structure_id = f.id AND h.category NOT IN ('BUS', 'HOSTEL')) AS total,
                               (SELECT count(DISTINCT reg_no) FROM fee_demands x WHERE x.structure_id = f.id) AS students
                        FROM fee_structures f JOIN departments d ON d.dept_key = f.dept_key
                        WHERE d.college_key = :college ORDER BY f.kind, f.academic_year DESC, d.name, f.study_year, f.semester
                        """).param("college", collegeKey())
                .query((rs, n) -> {
                    long id = rs.getLong("id");
                    List<Item> items = db.sql("""
                                    SELECT i.head_id, h.name, i.amount FROM fee_structure_items i JOIN fee_heads h ON h.id = i.head_id
                                    WHERE i.structure_id = ? AND h.category NOT IN ('BUS', 'HOSTEL') ORDER BY h.code
                                    """).param(id).query((r2, m) -> new Item(r2.getLong(1), r2.getString(2), r2.getBigDecimal(3))).list();
                    return new Structure(id, rs.getString("kind"), rs.getString("dept_key"), rs.getString("dept_name"),
                            rs.getInt("study_year"), rs.getObject("semester", Integer.class), rs.getString("exam_session"),
                            rs.getString("academic_year"), rs.getString("title"), rs.getString("due_date"), rs.getString("status"),
                            rs.getBigDecimal("total"), rs.getInt("students"), items);
                })
                .list();
    }

    @PostMapping("/fee-structures")
    @Transactional
    Structure addStructure(@RequestBody StructureRequest req, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        String dept = dept(req.deptKey());
        boolean exam = "EXAM".equalsIgnoreCase(req.kind());
        Integer semester = null;
        String session = null;
        int year;
        if (exam) {
            semester = req.semester() == null ? 0 : req.semester();
            if (semester < 1 || semester > 10) throw ApiException.badRequest("Semester: 1 to 10");
            session = LogbookController.text(req.examSession(), "Exam session (e.g. Nov/Dec 2026)", 60);
            year = (semester + 1) / 2;
        } else {
            year = req.studyYear() == null ? 0 : req.studyYear();
            if (year < 1 || year > 5) throw ApiException.badRequest("Year of study: 1 to 5");
        }
        String ay = LogbookController.text(req.academicYear() == null ? ErpSupport.academicYear() : req.academicYear(), "Academic year", 20);
        LocalDate due = ClassInchargeController.date(req.dueDate(), "Due date");
        String title = LogbookController.text(req.title() == null || req.title().isBlank()
                ? exam ? dept.toUpperCase(Locale.ROOT) + " semester " + semester + " exam fee " + session
                        : dept.toUpperCase(Locale.ROOT) + " year " + year + " fees " + ay
                : req.title(), "Title", 160);
        long id = db.sql("""
                        INSERT INTO fee_structures (kind, dept_key, study_year, semester, exam_session, academic_year, title, due_date, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING RETURNING id
                        """).params(exam ? "EXAM" : "ANNUAL", dept, year, semester, session, ay, title, due, me.name())
                .query(Long.class).optional()
                .orElseThrow(() -> ApiException.conflict(exam ? "An exam fee for this department, semester and exam session already exists"
                        : "A fee structure for this department, year and academic year already exists"));
        saveItems(id, req.items(), exam);
        audit.record(me.username(), me.name(), "ADDED_FEE_STRUCTURE", title, "Added the fee structure " + title + ".", http.getRemoteAddr());
        return structure(id);
    }

    @PutMapping("/fee-structures/{id}")
    @Transactional
    Structure editStructure(@PathVariable long id, @RequestBody StructureRequest req, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        Structure s = structure(id);
        LocalDate due = ClassInchargeController.date(req.dueDate(), "Due date");
        db.sql("UPDATE fee_structures SET title = ?, due_date = ? WHERE id = ?")
                .params(LogbookController.text(req.title(), "Title", 160), due, id).update();
        db.sql("DELETE FROM fee_structure_items WHERE structure_id = ?").param(id).update();
        saveItems(id, req.items(), "EXAM".equals(s.kind()));
        String detail = "";
        if ("PUBLISHED".equals(s.status())) {
            int changed = reraise(id);
            detail = " Dues of " + changed + " students updated (paid amounts kept).";
            if (changed > 0) {
                notifications.notify(Audience.STUDENT, s.deptKey(), null, "Fees updated: " + s.title(),
                        "Your fees for " + s.academicYear() + " were revised by the Accounts office. See Fees for the new total.", "fees");
            }
        }
        audit.record(me.username(), me.name(), "EDITED_FEE_STRUCTURE", s.title(), "Edited the fee structure " + s.title() + "." + detail,
                http.getRemoteAddr());
        return structure(id);
    }

    /** Deletes a draft, or a published structure no student has paid anything against (its dues go with it). */
    @org.springframework.web.bind.annotation.DeleteMapping("/fee-structures/{id}")
    @Transactional
    Map<String, String> deleteStructure(@PathVariable long id, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        Structure s = structure(id);
        boolean used = db.sql("""
                        SELECT EXISTS (SELECT 1 FROM fee_demands d WHERE d.structure_id = ? AND (d.paid > 0 OR d.concession > 0
                               OR EXISTS (SELECT 1 FROM fee_payments p WHERE p.allocation @> jsonb_build_array(jsonb_build_object('demandId', d.id)))))
                        """).param(id).query(Boolean.class).single();
        if (used) throw ApiException.conflict("Students have already paid against this structure; edit the amounts instead");
        db.sql("DELETE FROM fee_structures WHERE id = ?").param(id).update();
        audit.record(me.username(), me.name(), "DELETED_FEE_STRUCTURE", s.title(), "Deleted the fee structure " + s.title()
                + ("PUBLISHED".equals(s.status()) ? " and its " + s.students() + " students' dues." : "."), http.getRemoteAddr());
        return Map.of("status", "deleted");
    }

    /**
     * After a published structure is edited: each student's common-fee dues follow the new amounts and due date (never
     * below what is paid or conceded; a head taken off with nothing paid is removed). Returns the students affected.
     */
    private int reraise(long id) {
        java.util.Set<String> changed = new java.util.HashSet<>();
        db.sql("UPDATE fee_demands d SET due_date = f.due_date FROM fee_structures f WHERE f.id = d.structure_id AND f.id = ? AND d.due_date <> f.due_date")
                .param(id).update();
        List<Map<String, Object>> demands = db.sql("""
                        SELECT d.id, d.reg_no, d.amount, d.concession, d.paid, coalesce(i.amount, 0) AS target
                        FROM fee_demands d JOIN fee_heads h ON h.id = d.head_id
                        LEFT JOIN fee_structure_items i ON i.structure_id = d.structure_id AND i.head_id = d.head_id
                        WHERE d.structure_id = ? AND h.category NOT IN ('BUS', 'HOSTEL') FOR UPDATE OF d
                        """).param(id).query().listOfRows();
        for (Map<String, Object> d : demands) {
            long demandId = ((Number) d.get("id")).longValue();
            BigDecimal settled = ((BigDecimal) d.get("concession")).add((BigDecimal) d.get("paid"));
            BigDecimal target = (BigDecimal) d.get("target");
            if (target.signum() == 0 && settled.signum() == 0 && !onReceipt(demandId)) {
                db.sql("DELETE FROM fee_demands WHERE id = ?").param(demandId).update();
                changed.add((String) d.get("reg_no"));
            } else if (target.max(settled).compareTo((BigDecimal) d.get("amount")) != 0) {
                db.sql("UPDATE fee_demands SET amount = ? WHERE id = ?").params(target.max(settled), demandId).update();
                changed.add((String) d.get("reg_no"));
            }
        }
        changed.addAll(db.sql("""
                        INSERT INTO fee_demands (reg_no, structure_id, head_id, amount, due_date)
                        SELECT st.reg_no, f.id, i.head_id, i.amount, f.due_date
                        FROM fee_structures f JOIN fee_structure_items i ON i.structure_id = f.id
                        """ + FOR_STUDENTS + """
                        JOIN fee_heads h ON h.id = i.head_id
                        WHERE f.id = ? AND i.amount > 0 AND""" + RAISED_HEADS + """
                        ON CONFLICT DO NOTHING RETURNING reg_no
                        """).param(id).query(String.class).list());
        return changed.size();
    }

    private boolean onReceipt(long demandId) {
        return db.sql("SELECT EXISTS (SELECT 1 FROM fee_payments WHERE allocation @> jsonb_build_array(jsonb_build_object('demandId', ?)))")
                .param(demandId).query(Boolean.class).single();
    }

    /** Publishing raises the dues of every student of the department in that year of study. */
    @PostMapping("/fee-structures/{id}/publish")
    @Transactional
    Structure publish(@PathVariable long id, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        Structure s = structure(id);
        if (s.items().isEmpty()) throw ApiException.badRequest("Add the fee amounts first");
        if (!"DRAFT".equals(s.status())) throw ApiException.conflict("Already published");
        int raised = db.sql("""
                        INSERT INTO fee_demands (reg_no, structure_id, head_id, amount, due_date)
                        SELECT st.reg_no, f.id, i.head_id, i.amount, f.due_date
                        FROM fee_structures f JOIN fee_structure_items i ON i.structure_id = f.id
                        """ + FOR_STUDENTS + """
                        JOIN fee_heads h ON h.id = i.head_id
                        WHERE f.id = ? AND i.amount > 0 AND""" + RAISED_HEADS + """
                        ON CONFLICT DO NOTHING
                        """).param(id).update();
        db.sql("UPDATE fee_structures SET status = 'PUBLISHED', published_at = now() WHERE id = ?").param(id).update();
        if ("EXAM".equals(s.kind())) {
            notifications.notify(Audience.STUDENT, s.deptKey(), s.semester(), "Exam fee due: " + s.examSession(),
                    "Your end-semester exam fee for " + s.examSession() + " (₹" + s.total() + ") is due by " + s.dueDate()
                            + ". Pay online in Fees. The hall ticket is blocked until it is paid.", "fees");
        } else {
            // Bus and hostel follow each student's route and room
            db.sql("""
                            SELECT st.reg_no FROM students st JOIN student_services v ON v.reg_no = st.reg_no
                            WHERE st.dept_key = ? AND (st.semester + 1) / 2 = ?
                            """).params(s.deptKey(), s.studyYear()).query(String.class).list().forEach(this::syncServices);
            notifications.notify(Audience.STUDENT, s.deptKey(), null, "Fees due: " + s.title(),
                    "Your fees for " + s.academicYear() + " (₹" + s.total() + ") are due by " + s.dueDate()
                            + ". Pay online in Fees. The hall ticket and bus pass are blocked if fees are overdue.", "fees");
        }
        audit.record(me.username(), me.name(), "PUBLISHED_FEE_STRUCTURE", s.title(),
                "Published " + s.title() + ": " + raised + " dues raised (due " + s.dueDate() + ").", http.getRemoteAddr());
        return structure(id);
    }

    // ---------------------------------------------------------------- bus routes, hostel rooms and each student's services

    public record Rate(long id, String kind, String name, BigDecimal amount, boolean active, int students) {
    }

    public record RateRequest(String kind, String name, BigDecimal amount, Boolean active) {
    }

    public record ServiceRow(String regNo, String name, String deptKey, int semester, String section, Long busRateId,
                             Long hostelRateId, boolean feesRaised, BigDecimal total, BigDecimal paid, BigDecimal balance) {
    }

    /** busRateId / hostelRateId: null keeps the student's current one, 0 removes it. */
    public record ServicesRequest(List<String> regNos, Long busRateId, Long hostelRateId) {
    }

    @GetMapping("/service-rates")
    List<Rate> rates() {
        return db.sql("""
                        SELECT r.id, r.kind, r.name, r.amount, r.active,
                               (SELECT count(*) FROM student_services v WHERE v.bus_rate_id = r.id OR v.hostel_rate_id = r.id) AS students
                        FROM fee_service_rates r WHERE r.college_key = ? ORDER BY r.kind, r.amount, r.name
                        """).param(collegeKey())
                .query((rs, n) -> new Rate(rs.getLong("id"), rs.getString("kind"), rs.getString("name"), rs.getBigDecimal("amount"),
                        rs.getBoolean("active"), rs.getInt("students")))
                .list();
    }

    @PostMapping("/service-rates")
    Rate addRate(@RequestBody RateRequest req, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        String kind = "HOSTEL".equalsIgnoreCase(req.kind()) ? "HOSTEL" : "BUS".equalsIgnoreCase(req.kind()) ? "BUS" : null;
        if (kind == null) throw ApiException.badRequest("Choose bus route or hostel room");
        String name = LogbookController.text(req.name(), "Name", 120);
        BigDecimal amount = rateAmount(req.amount());
        long id = db.sql("""
                        INSERT INTO fee_service_rates (college_key, kind, name, amount) VALUES (?, ?, ?, ?)
                        ON CONFLICT (college_key, kind, name) DO NOTHING RETURNING id
                        """).params(collegeKey(), kind, name, amount).query(Long.class).optional()
                .orElseThrow(() -> ApiException.conflict(name + " already exists"));
        audit.record(me.username(), me.name(), "ADDED_SERVICE_RATE", name,
                "Added the " + (kind.equals("BUS") ? "bus route " : "hostel room ") + name + " at ₹" + amount + " a year.", http.getRemoteAddr());
        return rate(id);
    }

    /** A new price applies at once to the unpaid dues of every student using that route or room. */
    @PutMapping("/service-rates/{id}")
    @Transactional
    Map<String, Object> editRate(@PathVariable long id, @RequestBody RateRequest req, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        Rate old = rate(id);
        String name = LogbookController.text(req.name() == null ? old.name() : req.name(), "Name", 120);
        BigDecimal amount = req.amount() == null ? old.amount() : rateAmount(req.amount());
        boolean active = req.active() == null ? old.active() : req.active();
        if (!name.equals(old.name()) && db.sql("SELECT count(*) FROM fee_service_rates WHERE college_key = ? AND kind = ? AND name = ?")
                .params(collegeKey(), old.kind(), name).query(Integer.class).single() > 0) {
            throw ApiException.conflict(name + " already exists");
        }
        db.sql("UPDATE fee_service_rates SET name = ?, amount = ?, active = ? WHERE id = ?").params(name, amount, active, id).update();
        List<String> users = db.sql("SELECT reg_no FROM student_services WHERE bus_rate_id = ? OR hostel_rate_id = ?")
                .params(id, id).query(String.class).list();
        int changed = 0;
        for (String regNo : users) {
            if (syncServices(regNo)) {
                changed++;
                notifyFeesChanged(regNo);
            }
        }
        audit.record(me.username(), me.name(), "EDITED_SERVICE_RATE", name, "Set " + name + " to ₹" + amount + " a year"
                + (active ? "" : " (inactive)") + ": dues of " + changed + " students updated.", http.getRemoteAddr());
        return Map.of("rate", rate(id), "studentsUpdated", changed);
    }

    @GetMapping("/student-services")
    List<ServiceRow> services(@RequestParam String dept, @RequestParam(required = false) Integer year) {
        return db.sql("""
                        SELECT s.reg_no, s.name, s.dept_key, s.semester, s.section, v.bus_rate_id, v.hostel_rate_id,
                               EXISTS (SELECT 1 FROM fee_structures f WHERE f.kind = 'ANNUAL' AND f.dept_key = s.dept_key AND f.study_year = (s.semester + 1) / 2
                                       AND f.status = 'PUBLISHED') AS raised,
                               coalesce(sum(d.amount - d.concession), 0) AS total, coalesce(sum(d.paid), 0) AS paid,
                               coalesce(sum(d.amount - d.concession - d.paid), 0) AS balance
                        FROM students s LEFT JOIN student_services v ON v.reg_no = s.reg_no
                        LEFT JOIN fee_demands d ON d.reg_no = s.reg_no AND d.structure_id IN
                             (SELECT f.id FROM fee_structures f WHERE f.dept_key = s.dept_key AND f.study_year = (s.semester + 1) / 2)
                        WHERE s.dept_key = :dept AND (CAST(:year AS INTEGER) IS NULL OR (s.semester + 1) / 2 = :year)
                        GROUP BY s.reg_no, s.name, s.dept_key, s.semester, s.section, v.bus_rate_id, v.hostel_rate_id
                        ORDER BY s.reg_no LIMIT 2000
                        """).param("dept", dept(dept)).param("year", year)
                .query((rs, n) -> new ServiceRow(rs.getString("reg_no"), rs.getString("name"), rs.getString("dept_key"),
                        rs.getInt("semester"), rs.getString("section"), rs.getObject("bus_rate_id", Long.class),
                        rs.getObject("hostel_rate_id", Long.class), rs.getBoolean("raised"), rs.getBigDecimal("total"),
                        rs.getBigDecimal("paid"), rs.getBigDecimal("balance")))
                .list();
    }

    /** Sets the bus route and / or hostel room of one or many students; their unpaid dues follow at once. */
    @PutMapping("/student-services")
    @Transactional
    Map<String, Integer> setServices(@RequestBody ServicesRequest req, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        if (req.regNos() == null || req.regNos().isEmpty()) throw ApiException.badRequest("Choose at least one student");
        if (req.regNos().size() > 2000) throw ApiException.badRequest("At most 2000 students at a time");
        if (req.busRateId() == null && req.hostelRateId() == null) throw ApiException.badRequest("Choose a bus route or a hostel room");
        String bus = serviceRate(req.busRateId(), "BUS");
        String hostel = serviceRate(req.hostelRateId(), "HOSTEL");
        int changed = 0;
        for (String regNo : req.regNos()) {
            student(regNo);
            Map<String, Object> cur = db.sql("SELECT bus_rate_id, hostel_rate_id FROM student_services WHERE reg_no = ?").param(regNo)
                    .query().listOfRows().stream().findFirst().orElse(Map.of());
            Object b = req.busRateId() == null ? cur.get("bus_rate_id") : req.busRateId() == 0 ? null : req.busRateId();
            Object h = req.hostelRateId() == null ? cur.get("hostel_rate_id") : req.hostelRateId() == 0 ? null : req.hostelRateId();
            db.sql("""
                            INSERT INTO student_services (reg_no, bus_rate_id, hostel_rate_id, updated_by) VALUES (?, ?, ?, ?)
                            ON CONFLICT (reg_no) DO UPDATE SET bus_rate_id = EXCLUDED.bus_rate_id, hostel_rate_id = EXCLUDED.hostel_rate_id,
                                updated_by = EXCLUDED.updated_by, updated_at = now()
                            """).params(regNo, b, h, me.name()).update();
            if (syncServices(regNo)) {
                changed++;
                notifyFeesChanged(regNo);
            }
        }
        String what = (bus == null ? "" : "bus: " + bus) + (bus != null && hostel != null ? ", " : "") + (hostel == null ? "" : "hostel: " + hostel);
        audit.record(me.username(), me.name(), "SET_STUDENT_SERVICES", req.regNos().size() == 1 ? req.regNos().get(0) : req.regNos().size() + " students",
                "Set " + what + " for " + String.join(", ", req.regNos().subList(0, Math.min(20, req.regNos().size())))
                        + (req.regNos().size() > 20 ? " and " + (req.regNos().size() - 20) + " more" : "") + "; dues of " + changed + " changed.",
                http.getRemoteAddr());
        return Map.of("students", req.regNos().size(), "duesChanged", changed);
    }

    /**
     * Brings a student's bus and hostel dues (for the published fee structures of their current year) in line with their
     * route, room and the current rates. A due is never cut below what is already paid or conceded; one with nothing paid
     * is removed when the service is taken away. Returns whether any due changed.
     */
    private boolean syncServices(String regNo) {
        Map<String, Object> v = db.sql("SELECT bus_rate_id, hostel_rate_id FROM student_services WHERE reg_no = ?").param(regNo)
                .query().listOfRows().stream().findFirst().orElse(Map.of());
        List<Long> structures = db.sql("""
                        SELECT f.id FROM fee_structures f JOIN students st ON st.dept_key = f.dept_key AND (st.semester + 1) / 2 = f.study_year
                        WHERE st.reg_no = ? AND f.status = 'PUBLISHED' AND f.kind = 'ANNUAL'
                        """).param(regNo).query(Long.class).list();
        boolean changed = false;
        for (String kind : List.of("BUS", "HOSTEL")) {
            Object rateId = v.get(kind.equals("BUS") ? "bus_rate_id" : "hostel_rate_id");
            BigDecimal price = rateId == null ? null
                    : db.sql("SELECT amount FROM fee_service_rates WHERE id = ?").param(rateId).query(BigDecimal.class).single();
            long head = db.sql("SELECT id FROM fee_heads WHERE code = ?").param(kind).query(Long.class).single();
            for (long structure : structures) {
                Map<String, Object> d = db.sql("""
                                SELECT id, amount, concession, paid, service_rate_id FROM fee_demands
                                WHERE reg_no = ? AND structure_id = ? AND head_id = ? FOR UPDATE
                                """).params(regNo, structure, head).query().listOfRows().stream().findFirst().orElse(null);
                if (d == null) {
                    if (price != null && price.signum() > 0) {
                        db.sql("""
                                        INSERT INTO fee_demands (reg_no, structure_id, head_id, amount, due_date, service_rate_id)
                                        SELECT ?, id, ?, ?, due_date, ? FROM fee_structures WHERE id = ?
                                        """).params(regNo, head, price, rateId, structure).update();
                        changed = true;
                    }
                    continue;
                }
                long demandId = ((Number) d.get("id")).longValue();
                BigDecimal settled = ((BigDecimal) d.get("concession")).add((BigDecimal) d.get("paid"));
                if (price == null && settled.signum() == 0 && !onReceipt(demandId)) {
                    db.sql("DELETE FROM fee_demands WHERE id = ?").param(demandId).update();
                    changed = true;
                    continue;
                }
                BigDecimal target = (price == null ? BigDecimal.ZERO : price).max(settled);
                Object newRate = price == null ? d.get("service_rate_id") : rateId;
                boolean amountChanged = target.compareTo((BigDecimal) d.get("amount")) != 0;
                if (amountChanged || !java.util.Objects.equals(newRate, d.get("service_rate_id"))) {
                    db.sql("UPDATE fee_demands SET amount = ?, service_rate_id = ? WHERE id = ?").params(target, newRate, demandId).update();
                    changed |= amountChanged || price != null;
                }
            }
        }
        return changed;
    }

    private void notifyFeesChanged(String regNo) {
        db.sql("SELECT u.id, s.dept_key FROM users u JOIN students s ON s.reg_no = u.reg_no WHERE u.reg_no = ? AND u.role = 'STUDENT'")
                .param(regNo).query().listOfRows().stream().findFirst()
                .ifPresent(u -> notifications.notifyUser(((Number) u.get("id")).longValue(), Audience.STUDENT, (String) u.get("dept_key"), null,
                        "Fees updated", "Your bus / hostel fees were updated by the Accounts office. See Fees for the new total.", "fees"));
    }

    /** Validates a chosen route / room (0 = none); returns its name for the audit log ("none" for 0, null when unchanged). */
    private String serviceRate(Long id, String kind) {
        if (id == null) return null;
        if (id == 0) return "none";
        Rate r = rate(id);
        if (!r.kind().equals(kind)) throw ApiException.badRequest(kind.equals("BUS") ? "Choose a bus route" : "Choose a hostel room");
        if (!r.active()) throw ApiException.badRequest(r.name() + " is no longer offered");
        return r.name();
    }

    private Rate rate(long id) {
        return rates().stream().filter(r -> r.id() == id).findFirst().orElseThrow(() -> ApiException.notFound("Route or room not found"));
    }

    private static BigDecimal rateAmount(BigDecimal a) {
        if (a == null || a.signum() < 0 || a.compareTo(new BigDecimal("10000000")) > 0) throw ApiException.badRequest("Price: 0 to 1,00,00,000");
        return a.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    // ---------------------------------------------------------------- students

    @GetMapping("/dues")
    List<StudentDue> dues(@RequestParam(required = false) String dept, @RequestParam(required = false) String search,
                          @RequestParam(required = false) Boolean overdueOnly) {
        String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return db.sql("""
                        SELECT s.reg_no, s.name, s.dept_key, s.semester, s.section,
                               coalesce(sum(d.amount), 0) AS amount, coalesce(sum(d.concession), 0) AS concession,
                               coalesce(sum(d.paid), 0) AS paid,
                               coalesce(sum(d.amount - d.concession - d.paid), 0) AS balance,
                               coalesce(sum(d.amount - d.concession - d.paid) FILTER (WHERE d.due_date < current_date), 0) AS overdue
                        FROM students s JOIN fee_demands d ON d.reg_no = s.reg_no
                        WHERE""" + college("s.dept_key") + """
                          AND (CAST(:dept AS VARCHAR) IS NULL OR s.dept_key = :dept)
                          AND (:q = '' OR lower(s.reg_no) LIKE '%' || :q || '%' OR lower(s.name) LIKE '%' || :q || '%')
                        GROUP BY s.reg_no, s.name, s.dept_key, s.semester, s.section
                        HAVING NOT :overdueOnly OR coalesce(sum(d.amount - d.concession - d.paid) FILTER (WHERE d.due_date < current_date), 0) > 0
                        ORDER BY s.dept_key, s.reg_no LIMIT 2000
                        """).param("college", collegeKey()).param("dept", dept == null || dept.isBlank() ? null : dept)
                .param("q", q).param("overdueOnly", Boolean.TRUE.equals(overdueOnly))
                .query((rs, n) -> new StudentDue(rs.getString("reg_no"), rs.getString("name"), rs.getString("dept_key"),
                        rs.getInt("semester"), rs.getString("section"), rs.getBigDecimal("amount"), rs.getBigDecimal("concession"),
                        rs.getBigDecimal("paid"), rs.getBigDecimal("balance"), rs.getBigDecimal("overdue")))
                .list();
    }

    @GetMapping("/students/{regNo}")
    Ledger ledger(@PathVariable String regNo) {
        Map<String, Object> s = student(regNo);
        return new Ledger(regNo, (String) s.get("name"), (String) s.get("parent_phone"), fees.demands(regNo),
                fees.payments("p.reg_no = ?", regNo), fees.clearance(regNo));
    }

    public record PhoneRequest(String parentPhone) {
    }

    @PutMapping("/students/{regNo}/parent-phone")
    Map<String, String> parentPhone(@PathVariable String regNo, @RequestBody PhoneRequest req, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        student(regNo);
        String phone = req.parentPhone() == null ? "" : req.parentPhone().replaceAll("[^0-9]", "");
        if (!phone.matches("[6-9][0-9]{9}")) throw ApiException.badRequest("Parent mobile: a 10-digit Indian number");
        db.sql("UPDATE students SET parent_phone = ? WHERE reg_no = ?").params(phone, regNo).update();
        audit.record(me.username(), me.name(), "SET_PARENT_PHONE", regNo, "Updated the parent's mobile of " + regNo + ".", http.getRemoteAddr());
        return Map.of("status", "saved");
    }

    // ---------------------------------------------------------------- payments, receipts, Tally

    @GetMapping("/payments")
    List<FeeService.Payment> payments(@RequestParam(required = false) String from, @RequestParam(required = false) String to) {
        LocalDate f = from == null || from.isBlank() ? ErpSupport.today().minusDays(30) : ClassInchargeController.date(from, "From");
        LocalDate t = to == null || to.isBlank() ? ErpSupport.today() : ClassInchargeController.date(to, "To");
        return fees.payments("p.created_at::date BETWEEN ? AND ? AND s.dept_key IN (SELECT dept_key FROM departments WHERE college_key = ?)",
                f, t, collegeKey());
    }

    @GetMapping("/receipts/{receiptNo}")
    ResponseEntity<byte[]> receipt(@PathVariable String receiptNo) {
        return FeeController.pdf(fees.receiptPdf(receiptNo.replace('_', '/'), null), receiptNo);
    }

    /** Confirmed payments by fee head, as CSV for Tally (Date, Voucher, Ledger, Student, Amount). */
    @GetMapping("/tally-export")
    ResponseEntity<byte[]> tally(@RequestParam(required = false) String from, @RequestParam(required = false) String to,
                                 HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        LocalDate f = from == null || from.isBlank() ? ErpSupport.today().withDayOfMonth(1) : ClassInchargeController.date(from, "From");
        LocalDate t = to == null || to.isBlank() ? ErpSupport.today() : ClassInchargeController.date(to, "To");
        StringBuilder csv = new StringBuilder("Date,Voucher No,Ledger (Fee head),Reg No,Student,Amount,Gateway Ref\n");
        db.sql("""
                        SELECT to_char(p.paid_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY') AS day, p.receipt_no, h.name AS head,
                               p.reg_no, s.name, (a ->> 'amount')::numeric AS amount, p.gateway_payment_id
                        FROM fee_payments p JOIN students s ON s.reg_no = p.reg_no,
                             jsonb_array_elements(p.allocation) a
                        JOIN fee_demands d ON d.id = (a ->> 'demandId')::bigint JOIN fee_heads h ON h.id = d.head_id
                        WHERE p.status = 'PAID' AND (p.paid_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN ? AND ?
                          AND s.dept_key IN (SELECT dept_key FROM departments WHERE college_key = ?)
                        UNION ALL
                        -- Money received above the open dues (refundable), so the export adds up to what was collected
                        SELECT to_char(p.paid_at AT TIME ZONE 'Asia/Kolkata', 'DD-MM-YYYY'), p.receipt_no, 'Excess fee received (refundable)',
                               p.reg_no, s.name,
                               p.amount - coalesce((SELECT sum((a ->> 'amount')::numeric) FROM jsonb_array_elements(p.allocation) a), 0),
                               p.gateway_payment_id
                        FROM fee_payments p JOIN students s ON s.reg_no = p.reg_no
                        WHERE p.status = 'PAID' AND (p.paid_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN ? AND ?
                          AND s.dept_key IN (SELECT dept_key FROM departments WHERE college_key = ?)
                          AND p.amount > coalesce((SELECT sum((a ->> 'amount')::numeric) FROM jsonb_array_elements(p.allocation) a), 0)
                        ORDER BY 2, 3
                        """).params(f, t, collegeKey(), f, t, collegeKey())
                .query((rs, n) -> String.join(",", csv(rs.getString("day")), csv(rs.getString("receipt_no")), csv(rs.getString("head")),
                        csv(rs.getString("reg_no")), csv(rs.getString("name")), rs.getBigDecimal("amount").setScale(2, java.math.RoundingMode.HALF_UP).toPlainString(),
                        csv(rs.getString("gateway_payment_id"))))
                .list().forEach(line -> csv.append(line).append('\n'));
        audit.record(me.username(), me.name(), "EXPORTED_TALLY", f + " to " + t, "Exported the fee collections for Tally.", http.getRemoteAddr());
        return ResponseEntity.ok().contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"fee-collections-" + f + "-to-" + t + ".csv\"")
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    // ---------------------------------------------------------------- concessions and refunds (maker-checker)

    @GetMapping("/approvals")
    List<Approval> approvals() {
        List<Approval> out = new java.util.ArrayList<>(db.sql("""
                        SELECT c.id, c.kind, c.reg_no, s.name, h.name AS head, c.amount, c.reason, c.status, c.requested_by,
                               c.requested_at, c.decided_by
                        FROM fee_concessions c JOIN students s ON s.reg_no = c.reg_no JOIN fee_demands d ON d.id = c.demand_id
                        JOIN fee_heads h ON h.id = d.head_id
                        WHERE""" + college("s.dept_key") + """
                        ORDER BY c.status = 'PENDING' DESC, c.requested_at DESC LIMIT 300
                        """).param("college", collegeKey())
                .query((rs, n) -> new Approval(rs.getLong("id"), rs.getString("kind"), rs.getString("reg_no"), rs.getString("name"),
                        rs.getString("head"), rs.getBigDecimal("amount"), rs.getString("reason"), rs.getString("status"),
                        rs.getString("requested_by"), ErpSupport.display(rs.getObject("requested_at", OffsetDateTime.class)),
                        rs.getString("decided_by")))
                .list());
        out.addAll(db.sql("""
                        SELECT r.id, r.reg_no, s.name, p.receipt_no, r.amount, r.reason, r.status, r.requested_by, r.requested_at, r.decided_by
                        FROM fee_refunds r JOIN students s ON s.reg_no = r.reg_no JOIN fee_payments p ON p.id = r.payment_id
                        WHERE""" + college("s.dept_key") + """
                        ORDER BY r.status = 'PENDING' DESC, r.requested_at DESC LIMIT 300
                        """).param("college", collegeKey())
                .query((rs, n) -> new Approval(rs.getLong("id"), "REFUND", rs.getString("reg_no"), rs.getString("name"),
                        "Receipt " + rs.getString("receipt_no"), rs.getBigDecimal("amount"), rs.getString("reason"), rs.getString("status"),
                        rs.getString("requested_by"), ErpSupport.display(rs.getObject("requested_at", OffsetDateTime.class)),
                        rs.getString("decided_by")))
                .list());
        return out;
    }

    @PostMapping("/concessions")
    Approval requestConcession(@RequestBody ConcessionRequest req, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        student(req.regNo());
        String kind = "SCHOLARSHIP".equalsIgnoreCase(req.kind()) ? "SCHOLARSHIP" : "CONCESSION";
        BigDecimal amount = amount(req.amount());
        String reason = LogbookController.text(req.reason(), "Reason", 500);
        BigDecimal open = db.sql("SELECT amount - concession - paid FROM fee_demands WHERE id = ? AND reg_no = ?")
                .params(req.demandId(), req.regNo()).query(BigDecimal.class).optional()
                .orElseThrow(() -> ApiException.badRequest("Choose one of the student's dues"));
        if (amount.compareTo(open) > 0) throw ApiException.badRequest("At most ₹" + open + " (the unpaid part of that due)");
        long id = db.sql("""
                        INSERT INTO fee_concessions (reg_no, demand_id, kind, amount, reason, requested_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING id
                        """).params(req.regNo(), req.demandId(), kind, amount, reason, me.username()).query(Long.class).single();
        audit.record(me.username(), me.name(), "REQUESTED_" + kind, req.regNo(),
                "Requested a " + kind.toLowerCase(Locale.ROOT) + " of ₹" + amount + " for " + req.regNo() + ": " + reason, http.getRemoteAddr());
        notifications.notify(Audience.ACCOUNTS, deptOf(req.regNo()), null, "Approval needed: " + kind.toLowerCase(Locale.ROOT),
                me.name() + " requested ₹" + amount + " for " + req.regNo() + ". The Accounts head approves it.", "accounts-approvals");
        return approvals().stream().filter(a -> a.id() == id && !a.kind().equals("REFUND")).findFirst().orElseThrow();
    }

    @PostMapping("/refunds")
    Approval requestRefund(@RequestBody RefundRequest req, HttpServletRequest http) {
        CurrentUser me = CurrentUser.get();
        Map<String, Object> p = db.sql("SELECT reg_no, amount, refunded, status FROM fee_payments WHERE id = ?").param(req.paymentId())
                .query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("Payment not found"));
        if (!"PAID".equals(p.get("status"))) throw ApiException.badRequest("Only a confirmed payment can be refunded");
        String regNo = (String) p.get("reg_no");
        student(regNo);
        BigDecimal amount = amount(req.amount());
        BigDecimal left = ((BigDecimal) p.get("amount")).subtract((BigDecimal) p.get("refunded"));
        if (amount.compareTo(left) > 0) throw ApiException.badRequest("At most ₹" + left + " can be refunded from this payment");
        String reason = LogbookController.text(req.reason(), "Reason", 500);
        long id = db.sql("INSERT INTO fee_refunds (reg_no, payment_id, amount, reason, requested_by) VALUES (?, ?, ?, ?, ?) RETURNING id")
                .params(regNo, req.paymentId(), amount, reason, me.username()).query(Long.class).single();
        audit.record(me.username(), me.name(), "REQUESTED_REFUND", regNo, "Requested a refund of ₹" + amount + " for " + regNo + ": " + reason,
                http.getRemoteAddr());
        notifications.notify(Audience.ACCOUNTS, deptOf(regNo), null, "Approval needed: refund",
                me.name() + " requested a refund of ₹" + amount + " for " + regNo + ".", "accounts-approvals");
        return approvals().stream().filter(a -> a.id() == id && a.kind().equals("REFUND")).findFirst().orElseThrow();
    }

    @PostMapping("/concessions/{id}/decide")
    @Transactional
    Map<String, String> decideConcession(@PathVariable long id, @RequestBody Decision d, HttpServletRequest http) {
        CurrentUser me = requireHead();
        Map<String, Object> c = db.sql("SELECT * FROM fee_concessions WHERE id = ? FOR UPDATE").param(id).query().listOfRows()
                .stream().findFirst().orElseThrow(() -> ApiException.notFound("Not found"));
        checkChecker(c, me);
        boolean approve = Boolean.TRUE.equals(d.approve());
        if (approve) {
            int n = db.sql("UPDATE fee_demands SET concession = concession + ? WHERE id = ? AND concession + paid + ? <= amount")
                    .params(c.get("amount"), c.get("demand_id"), c.get("amount")).update();
            if (n == 0) throw ApiException.conflict("The due has changed (it is paid or reduced already); reject this request");
        }
        db.sql("UPDATE fee_concessions SET status = ?, decided_by = ?, decided_at = now() WHERE id = ?")
                .params(approve ? "APPROVED" : "REJECTED", me.username(), id).update();
        audit.record(me.username(), me.name(), (approve ? "APPROVED_" : "REJECTED_") + c.get("kind"), (String) c.get("reg_no"),
                (approve ? "Approved" : "Rejected") + " the " + c.get("kind").toString().toLowerCase(Locale.ROOT) + " of ₹" + c.get("amount")
                        + " for " + c.get("reg_no") + " (requested by " + c.get("requested_by") + ").", http.getRemoteAddr());
        return Map.of("status", approve ? "approved" : "rejected");
    }

    @PostMapping("/refunds/{id}/decide")
    @Transactional
    Map<String, String> decideRefund(@PathVariable long id, @RequestBody Decision d, HttpServletRequest http) {
        CurrentUser me = requireHead();
        Map<String, Object> r = db.sql("SELECT * FROM fee_refunds WHERE id = ? FOR UPDATE").param(id).query().listOfRows()
                .stream().findFirst().orElseThrow(() -> ApiException.notFound("Not found"));
        checkChecker(r, me);
        boolean approve = Boolean.TRUE.equals(d.approve());
        if (approve) {
            BigDecimal amount = (BigDecimal) r.get("amount");
            Map<String, Object> pay = db.sql("""
                            SELECT p.amount, p.refunded,
                                   coalesce((SELECT sum((a ->> 'amount')::numeric) FROM jsonb_array_elements(p.allocation) a), 0) AS applied
                            FROM fee_payments p WHERE p.id = ? FOR UPDATE
                            """).param(r.get("payment_id")).query().singleRow();
            int n = db.sql("UPDATE fee_payments SET refunded = refunded + ? WHERE id = ? AND refunded + ? <= amount")
                    .params(amount, r.get("payment_id"), amount).update();
            if (n == 0) throw ApiException.conflict("More than the payment would be refunded");
            // Money that paid no due (an excess payment) is refunded first; the rest no longer pays the dues: take it
            // back from the dues this payment cleared, latest first
            BigDecimal unapplied = ((BigDecimal) pay.get("amount")).subtract((BigDecimal) pay.get("applied"))
                    .subtract((BigDecimal) pay.get("refunded")).max(BigDecimal.ZERO);
            BigDecimal left = amount.subtract(unapplied.min(amount));
            List<Map<String, Object>> demands = db.sql("""
                            SELECT d.id, d.paid, (a ->> 'amount')::numeric AS applied FROM fee_payments p, jsonb_array_elements(p.allocation) a
                            JOIN fee_demands d ON d.id = (a ->> 'demandId')::bigint
                            WHERE p.id = ? ORDER BY d.due_date DESC, d.id DESC
                            """).param(r.get("payment_id")).query().listOfRows();
            for (Map<String, Object> dm : demands) {
                if (left.signum() <= 0) break;
                BigDecimal take = left.min((BigDecimal) dm.get("paid")).min((BigDecimal) dm.get("applied"));
                db.sql("UPDATE fee_demands SET paid = paid - ? WHERE id = ?").params(take, dm.get("id")).update();
                left = left.subtract(take);
            }
        }
        db.sql("UPDATE fee_refunds SET status = ?, decided_by = ?, decided_at = now() WHERE id = ?")
                .params(approve ? "APPROVED" : "REJECTED", me.username(), id).update();
        audit.record(me.username(), me.name(), approve ? "APPROVED_REFUND" : "REJECTED_REFUND", (String) r.get("reg_no"),
                (approve ? "Approved" : "Rejected") + " the refund of ₹" + r.get("amount") + " for " + r.get("reg_no")
                        + " (requested by " + r.get("requested_by") + ").", http.getRemoteAddr());
        return Map.of("status", approve ? "approved" : "rejected");
    }

    // ---------------------------------------------------------------- helpers

    private boolean head(CurrentUser me) {
        return db.sql("SELECT accounts_head FROM users WHERE id = ?").param(me.id()).query(Boolean.class).optional().orElse(false);
    }

    private CurrentUser requireHead() {
        CurrentUser me = CurrentUser.get();
        if (!head(me)) throw new ApiException(HttpStatus.FORBIDDEN, "Only the Accounts head approves");
        return me;
    }

    /** Maker-checker: pending, and decided by someone other than the person who entered it. */
    private static void checkChecker(Map<String, Object> row, CurrentUser me) {
        if (!"PENDING".equals(row.get("status"))) throw ApiException.conflict("Already decided");
        if (me.username().equalsIgnoreCase((String) row.get("requested_by"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "The person who entered a request cannot approve it");
        }
    }

    private Map<String, Object> student(String regNo) {
        return db.sql("""
                        SELECT s.name, s.parent_phone FROM students s JOIN departments d ON d.dept_key = s.dept_key
                        WHERE s.reg_no = ? AND d.college_key = ?
                        """).params(regNo == null ? "" : regNo.trim(), collegeKey()).query().listOfRows().stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Student not found"));
    }

    private String deptOf(String regNo) {
        return db.sql("SELECT dept_key FROM students WHERE reg_no = ?").param(regNo).query(String.class).single();
    }

    private String dept(String key) {
        return db.sql("SELECT dept_key FROM departments WHERE dept_key = ? AND college_key = ?")
                .params(key == null ? "" : key.trim().toLowerCase(Locale.ROOT), collegeKey()).query(String.class).optional()
                .orElseThrow(() -> ApiException.badRequest("Choose a department"));
    }

    private void saveItems(long id, List<ItemRequest> items, boolean exam) {
        if (items == null) return;
        for (ItemRequest i : items) {
            if (i.headId() == null || i.amount() == null) continue;
            String cat = db.sql("SELECT category FROM fee_heads WHERE id = ?").param(i.headId()).query(String.class).optional()
                    .orElseThrow(() -> ApiException.badRequest("Unknown fee head"));
            // Bus and hostel differ per student (Student services); exam fees are raised per exam session (EXAM structures)
            if (cat.equals("BUS") || cat.equals("HOSTEL") || exam != cat.equals("EXAM")) continue;
            if (i.amount().signum() < 0 || i.amount().compareTo(new BigDecimal("10000000")) > 0) {
                throw ApiException.badRequest("Fee amounts: 0 to 1,00,00,000");
            }
            db.sql("INSERT INTO fee_structure_items (structure_id, head_id, amount) VALUES (?, ?, ?)")
                    .params(id, i.headId(), i.amount().setScale(2, java.math.RoundingMode.HALF_UP)).update();
        }
    }

    private Structure structure(long id) {
        return structures().stream().filter(s -> s.id() == id).findFirst().orElseThrow(() -> ApiException.notFound("Fee structure not found"));
    }

    private static BigDecimal amount(BigDecimal a) {
        if (a == null || a.signum() <= 0) throw ApiException.badRequest("Enter an amount above 0");
        return a.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private static String category(String c) {
        String v = c == null || c.isBlank() ? "ACADEMIC" : c.trim().toUpperCase(Locale.ROOT);
        if (!List.of("ACADEMIC", "EXAM", "BUS", "HOSTEL", "OTHER").contains(v)) throw ApiException.badRequest("Category: ACADEMIC, EXAM, BUS, HOSTEL or OTHER");
        return v;
    }

    private static String csv(String v) {
        if (v == null) return "";
        String s = v.replace("\"", "\"\"");
        // Spreadsheet formula injection: a leading =, +, - or @ is neutralised
        if (!s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0) s = "'" + s;
        return "\"" + s + "\"";
    }
}
