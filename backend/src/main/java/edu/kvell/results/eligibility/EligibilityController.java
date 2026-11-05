package edu.kvell.results.eligibility;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Departments;
import edu.kvell.results.erp.ErpSupport;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
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
 * Exam eligibility (COE). A student's attendance for the semester comes from the attendance registers the Associate
 * Dean approved. At or above attendance.eligible_pct the student is eligible. Below it, a student whose attendance
 * falls in a fine band is eligible once the fine is paid (condoned); below every band the student is not eligible.
 */
@RestController
@RequestMapping("/api/admin/eligibility")
public class EligibilityController {

    public record Slab(Long id, BigDecimal minPct, BigDecimal maxPct, BigDecimal fineAmount) {
    }

    public record StudentItem(String regNo, String studentName, String dob, String department, String deptKey,
                              String classYear, int semester, Integer classesAttended, Integer totalClasses,
                              Double attendancePercent, BigDecimal fineDue, String fineStatus, String receiptNo,
                              BigDecimal paidAmount, String effectiveStatus) {
    }

    public record PayRequest(String receipt_no, Integer semester) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final ErpSupport erp;

    public EligibilityController(JdbcClient db, Departments departments, ErpSupport erp) {
        this.db = db;
        this.departments = departments;
        this.erp = erp;
    }

    @GetMapping("/slabs")
    List<Slab> slabs() {
        ErpSupport.require(Role.ADMIN, Role.SUPER_ADMIN);
        return slabsOf(departments.college());
    }

    @PutMapping("/slabs")
    @Transactional
    List<Slab> saveSlabs(@RequestBody List<Slab> slabs) {
        ErpSupport.require(Role.ADMIN, Role.SUPER_ADMIN);
        String college = departments.college();
        List<Slab> clean = new ArrayList<>();
        for (Slab s : slabs == null ? List.<Slab>of() : slabs) {
            if (s == null || s.minPct() == null || s.maxPct() == null || s.fineAmount() == null) {
                throw ApiException.badRequest("Fill in the range and the fine of every band");
            }
            if (s.minPct().signum() < 0 || s.maxPct().compareTo(BigDecimal.valueOf(100)) > 0 || s.minPct().compareTo(s.maxPct()) >= 0) {
                throw ApiException.badRequest("Each band needs a 'from' below its 'to', between 0 and 100");
            }
            if (s.fineAmount().signum() < 0) throw ApiException.badRequest("A fine cannot be negative");
            clean.add(s);
        }
        clean.sort(Comparator.comparing(Slab::minPct));
        for (int i = 1; i < clean.size(); i++) {
            if (clean.get(i).minPct().compareTo(clean.get(i - 1).maxPct()) < 0) throw ApiException.badRequest("The bands overlap");
        }
        db.sql("DELETE FROM eligibility_fine_slabs WHERE college_key = ?").param(college).update();
        for (Slab s : clean) {
            db.sql("INSERT INTO eligibility_fine_slabs (college_key, min_pct, max_pct, fine_amount) VALUES (?, ?, ?, ?)")
                    .params(college, s.minPct(), s.maxPct(), s.fineAmount()).update();
        }
        return slabsOf(college);
    }

    @GetMapping("/students")
    List<StudentItem> students(@RequestParam String dept, @RequestParam(required = false) String year,
                               @RequestParam Integer semester) {
        ErpSupport.require(Role.ADMIN, Role.SUPER_ADMIN);
        String d = departments.key(dept);
        requireCollege(d);
        return evaluate(d, year, semester);
    }

    /** The eligibility of a class (used by hall-ticket publishing too). */
    public List<StudentItem> evaluate(String d, String year, int semester) {
        String deptName = departments.name(d);
        List<Slab> slabs = slabsOf(departments.college());
        double eligiblePct = erp.intSetting("attendance.eligible_pct", 75);
        List<Map<String, Object>> rows = db.sql("""
                        SELECT s.reg_no, s.name, s.dob, s.year_label, s.semester,
                               (SELECT count(*) FROM (SELECT DISTINCT r2.batch_id, r2.attendance_date, r2.session_slot
                                 FROM attendance_records r2 JOIN attendance_batches b2 ON b2.batch_id = r2.batch_id
                                 WHERE b2.status = 'ADEAN_APPROVED' AND b2.dept_key = s.dept_key AND b2.semester = ?) c) AS total,
                               (SELECT count(*) FROM attendance_records r JOIN attendance_batches b ON b.batch_id = r.batch_id
                                 WHERE r.reg_no = s.reg_no AND b.status = 'ADEAN_APPROVED' AND b.semester = ?
                                   AND r.status IN ('PRESENT', 'ON_DUTY')) AS attended,
                               p.receipt_no, p.amount
                        FROM students s LEFT JOIN eligibility_fine_payments p ON p.reg_no = s.reg_no AND p.semester = ?
                        WHERE s.dept_key = ? AND s.semester = ? AND (CAST(? AS VARCHAR) IS NULL OR s.year_label = ?)
                        ORDER BY s.reg_no
                        """).params(semester, semester, semester, d, semester, blankToNull(year), blankToNull(year))
                .query().listOfRows();
        List<StudentItem> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            int total = ((Number) r.get("total")).intValue();
            int attended = ((Number) r.get("attended")).intValue();
            Double pct = total == 0 ? null : Math.floor(attended * 1000.0 / total) / 10.0;
            String receipt = (String) r.get("receipt_no");
            BigDecimal fine = null;
            String fineStatus = null;
            String status;
            if (pct == null) {
                status = null; // no approved attendance yet: "No Data"
            } else if (pct >= eligiblePct) {
                status = "ELIGIBLE";
            } else {
                Slab slab = slabs.stream().filter(s -> pct >= s.minPct().doubleValue() && pct < s.maxPct().doubleValue())
                        .findFirst().orElse(null);
                if (slab == null) {
                    status = "NOT_ELIGIBLE";
                } else {
                    fine = slab.fineAmount();
                    fineStatus = receipt != null ? "PAID" : "PENDING";
                    status = receipt != null ? "ELIGIBLE_CONDONED" : "NOT_ELIGIBLE";
                }
            }
            Object dob = r.get("dob");
            out.add(new StudentItem((String) r.get("reg_no"), (String) r.get("name"),
                    dob == null ? "" : ((java.sql.Date) dob).toLocalDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")),
                    deptName, d, (String) r.get("year_label"), ((Number) r.get("semester")).intValue(),
                    total == 0 ? null : attended, total == 0 ? null : total, pct, fine, fineStatus, receipt,
                    (BigDecimal) r.get("amount"), status));
        }
        return out;
    }

    /** Records the fine receipt of a student whose attendance is in a fine band. */
    @PostMapping("/fines/{regNo}/pay")
    @Transactional
    Map<String, Object> pay(@PathVariable String regNo, @RequestBody PayRequest req) {
        CurrentUser me = ErpSupport.require(Role.ADMIN, Role.SUPER_ADMIN);
        if (req == null || req.receipt_no() == null || req.receipt_no().isBlank()) throw ApiException.badRequest("Give the receipt number");
        String receipt = req.receipt_no().trim();
        if (receipt.length() > 40) throw ApiException.badRequest("The receipt number is at most 40 characters");
        Map<String, Object> s = db.sql("SELECT dept_key, semester, year_label FROM students WHERE reg_no = ?").param(regNo)
                .query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("Student not found"));
        String dept = (String) s.get("dept_key");
        requireCollege(dept);
        int sem = req.semester() == null ? ((Number) s.get("semester")).intValue() : req.semester();
        StudentItem item = students(dept, null, sem).stream().filter(x -> x.regNo().equals(regNo)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Student not found in that semester"));
        if (item.fineDue() == null) throw ApiException.badRequest("This student has no fine to pay");
        if ("PAID".equals(item.fineStatus())) throw ApiException.conflict("The fine is already paid (receipt " + item.receiptNo() + ")");
        db.sql("INSERT INTO eligibility_fine_payments (reg_no, semester, amount, receipt_no, recorded_by) VALUES (?, ?, ?, ?, ?)")
                .params(regNo, sem, item.fineDue(), receipt, me.name()).update();
        return Map.of("regNo", regNo, "status", "ELIGIBLE_CONDONED", "receiptNo", receipt);
    }

    private List<Slab> slabsOf(String college) {
        return db.sql("SELECT id, min_pct, max_pct, fine_amount FROM eligibility_fine_slabs WHERE college_key = ? ORDER BY min_pct DESC")
                .param(college)
                .query((rs, n) -> new Slab(rs.getLong(1), rs.getBigDecimal(2), rs.getBigDecimal(3), rs.getBigDecimal(4))).list();
    }

    private void requireCollege(String dept) {
        int n = db.sql("SELECT count(*) FROM departments WHERE dept_key = ? AND college_key = ?").params(dept, departments.college())
                .query(Integer.class).single();
        if (n == 0) throw new ApiException(HttpStatus.FORBIDDEN, "This department is of another college");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() || "ALL".equalsIgnoreCase(s) ? null : s.trim();
    }
}
