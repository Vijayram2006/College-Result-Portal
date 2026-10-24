package edu.kvell.results.admin;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REQ-15: the COE withholds a student's published result of one semester and assessment with a reason code (WH1
 * malpractice, WH2 fee dues, WH3 attendance shortage; new codes are rows of withhold_codes). The student then sees
 * "Withheld" with the reason instead of the marks, until the COE releases it.
 */
@RestController
@RequestMapping("/api/admin/withholds")
public class WithholdController {

    public record Code(String code, String description) {
    }

    public record Withhold(String regNo, String name, String deptKey, String semester, String assessmentType,
                           String code, String description, String reason, String setBy, OffsetDateTime setAt) {
    }

    public record WithholdInput(String regNo, String semester, String assessmentType, String code, String reason) {
    }

    private static final Set<String> ASSESSMENTS = Set.of("IAT-1", "IAT-2", "End Semester");

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final edu.kvell.results.common.ResultsCache cache;

    public WithholdController(JdbcClient db, Departments departments, AuditService audit,
                              edu.kvell.results.common.ResultsCache cache) {
        this.cache = cache;
        this.db = db;
        this.departments = departments;
        this.audit = audit;
    }

    @GetMapping("/codes")
    List<Code> codes() {
        return db.sql("SELECT code, description FROM withhold_codes ORDER BY code")
                .query((rs, n) -> new Code(rs.getString(1), rs.getString(2))).list();
    }

    @GetMapping
    List<Withhold> list(@RequestParam(required = false) String dept) {
        String d = dept == null || dept.isBlank() ? null : departments.key(dept);
        return db.sql("""
                        SELECT w.reg_no, s.name, s.dept_key, w.semester, w.assessment_type, w.code, c.description,
                               w.reason, w.set_by, w.set_at
                        FROM result_withholds w JOIN students s ON s.reg_no = w.reg_no
                        JOIN withhold_codes c ON c.code = w.code
                        WHERE %s AND (CAST(:dept AS VARCHAR) IS NULL OR s.dept_key = :dept)
                        ORDER BY w.set_at DESC
                        """.formatted(departments.inCollege("s.dept_key")))
                .param("dept", d)
                .query((rs, n) -> new Withhold(rs.getString(1), rs.getString(2), rs.getString(3),
                        Semesters.label(rs.getInt(4)), rs.getString(5), rs.getString(6), rs.getString(7),
                        rs.getString(8), rs.getString(9), rs.getObject(10, OffsetDateTime.class)))
                .list();
    }

    @PutMapping
    List<Withhold> set(@RequestBody WithholdInput in, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        if (in == null || in.regNo() == null) throw ApiException.badRequest("Choose the student");
        String reg = in.regNo().trim().toUpperCase(Locale.ROOT);
        String dept = db.sql("SELECT dept_key FROM students WHERE reg_no = ?").param(reg).query(String.class)
                .optional().orElseThrow(() -> ApiException.notFound("Student " + reg + " not found"));
        departments.key(dept); // the student must be in the COE's college
        int sem = Semesters.parse(in.semester());
        String assessment = in.assessmentType() == null ? "" : in.assessmentType().trim();
        if (!ASSESSMENTS.contains(assessment)) throw ApiException.badRequest("Choose IAT-1, IAT-2 or End Semester");
        String code = in.code() == null ? "" : in.code().trim().toUpperCase(Locale.ROOT);
        if (db.sql("SELECT count(*) FROM withhold_codes WHERE code = ?").param(code).query(Integer.class).single() == 0) {
            throw ApiException.badRequest("Unknown withhold code " + code);
        }
        String reason = in.reason() == null ? null : in.reason().trim();
        if (reason != null && reason.length() > 300) throw ApiException.badRequest("Reason: at most 300 characters");
        db.sql("""
                        INSERT INTO result_withholds (reg_no, semester, assessment_type, code, reason, set_by)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT (reg_no, semester, assessment_type) DO UPDATE SET code = EXCLUDED.code,
                            reason = EXCLUDED.reason, set_by = EXCLUDED.set_by, set_at = now()
                        """).params(reg, sem, assessment, code, reason, user.name()).update();
        cache.clear();
        audit.record(user.username(), user.name(), "WITHHELD_RESULT", reg,
                "Withheld the " + Semesters.label(sem) + " " + assessment + " result of " + reg + " (" + code + ")"
                        + (reason == null || reason.isBlank() ? "." : ": " + reason), http.getRemoteAddr());
        return list(null);
    }

    @DeleteMapping
    List<Withhold> release(@RequestParam String regNo, @RequestParam String semester, @RequestParam String assessment,
                           HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        String reg = regNo.trim().toUpperCase(Locale.ROOT);
        String dept = db.sql("SELECT dept_key FROM students WHERE reg_no = ?").param(reg).query(String.class)
                .optional().orElseThrow(() -> ApiException.notFound("Student " + reg + " not found"));
        departments.key(dept);
        int sem = Semesters.parse(semester);
        db.sql("DELETE FROM result_withholds WHERE reg_no = ? AND semester = ? AND assessment_type = ?")
                .params(reg, sem, assessment.trim()).update();
        cache.clear();
        audit.record(user.username(), user.name(), "RELEASED_WITHHELD_RESULT", reg,
                "Released the withheld " + Semesters.label(sem) + " " + assessment + " result of " + reg + ".",
                http.getRemoteAddr());
        return list(null);
    }
}
