package edu.kvell.results.erp;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
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
import tools.jackson.databind.ObjectMapper;

/**
 * Faculty performance: a scorecard per faculty member and term, calculated from data the ERP already has (nobody types
 * in scores). Each measure is scored 0-100; the total is the weighted average over the measures that have data, with
 * the weights set by the Associate Dean. Faculty see only their own scorecard; the HOD reviews the department and adds
 * remarks; the Associate Dean reviews the college and adds remarks.
 */
@RestController
@RequestMapping("/api/erp/performance")
public class PerformanceController {

    public record Measure(String code, String name, String description, BigDecimal weight) {
    }

    public record WeightRequest(Map<String, BigDecimal> weights) {
    }

    /** score: 0-100, null when there is no data for it yet. */
    public record Score(String code, String name, BigDecimal weight, Double score, String detail) {
    }

    public record Scorecard(long userId, String username, String name, String deptKey, String academicYear, String term,
                            Double total, List<Score> scores, String hodRemarks, String hodBy, String deanRemarks,
                            String deanBy, String computedAt) {
    }

    public record RemarksRequest(String remarks) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final ObjectMapper json;

    public PerformanceController(JdbcClient db, Departments departments, AuditService audit, ObjectMapper json) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
        this.json = json;
    }

    @GetMapping("/measures")
    List<Measure> measures() {
        ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        return db.sql("SELECT code, name, description, weight FROM performance_measures ORDER BY sort_order")
                .query((rs, n) -> new Measure(rs.getString(1), rs.getString(2), rs.getString(3), rs.getBigDecimal(4))).list();
    }

    /** The Associate Dean sets the weight of each measure. */
    @PutMapping("/measures")
    @Transactional
    List<Measure> weights(@RequestBody WeightRequest req, HttpServletRequest http) {
        CurrentUser dean = ErpSupport.require(Role.DEAN);
        if (req == null || req.weights() == null) throw ApiException.badRequest("Weights are required");
        for (Map.Entry<String, BigDecimal> e : req.weights().entrySet()) {
            BigDecimal w = e.getValue() == null ? BigDecimal.ZERO : e.getValue();
            if (w.signum() < 0 || w.compareTo(BigDecimal.valueOf(100)) > 0) throw ApiException.badRequest("Weights: 0 to 100");
            db.sql("UPDATE performance_measures SET weight = ?, updated_by = ?, updated_at = now() WHERE code = ?")
                    .params(w, dean.name(), e.getKey()).update();
        }
        audit.record(dean.username(), dean.name(), "SET_PERFORMANCE_WEIGHTS", "performance",
                "Set the faculty performance weights: " + req.weights() + ".", http.getRemoteAddr());
        return measures();
    }

    /** Faculty: their own scorecard only. */
    @GetMapping("/me")
    Scorecard me() {
        CurrentUser me = ErpSupport.require(Role.FACULTY);
        return scorecard(me.id());
    }

    /** HOD: the faculty of their department. Associate Dean: the college, or one department. */
    @GetMapping
    List<Scorecard> list(@RequestParam(required = false) String dept) {
        CurrentUser me = ErpSupport.require(Role.HOD, Role.DEAN);
        String where;
        Object param;
        if (me.role() == Role.HOD) {
            where = "u.dept_key = ?";
            param = me.deptKey();
        } else if (dept != null && !dept.isBlank()) {
            where = "u.dept_key = ?";
            param = departments.key(dept);
        } else {
            where = "u.dept_key IN (SELECT dept_key FROM departments WHERE college_key = ?)";
            param = me.collegeKey();
        }
        List<Long> ids = db.sql("SELECT u.id FROM users u WHERE u.role = 'FACULTY' AND u.enabled AND " + where + " ORDER BY u.dept_key, u.display_name")
                .param(param).query(Long.class).list();
        List<Scorecard> out = new ArrayList<>();
        for (long id : ids) out.add(scorecard(id));
        return out;
    }

    @PostMapping("/{userId}/remarks")
    Scorecard remarks(@PathVariable long userId, @RequestBody RemarksRequest req, HttpServletRequest http) {
        CurrentUser me = ErpSupport.require(Role.HOD, Role.DEAN);
        String dept = db.sql("SELECT dept_key FROM users WHERE id = ? AND role = 'FACULTY'").param(userId).query(String.class)
                .optional().orElseThrow(() -> ApiException.notFound("Faculty member not found"));
        if (me.role() == Role.HOD && !dept.equals(me.deptKey())) throw new ApiException(HttpStatus.FORBIDDEN, "Only your department");
        if (me.role() == Role.DEAN && db.sql("SELECT count(*) FROM departments WHERE dept_key = ? AND college_key = ?")
                .params(dept, me.collegeKey()).query(Integer.class).single() == 0) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only your college");
        }
        String text = LogbookController.text(req.remarks(), "Remarks", 1000);
        scorecard(userId); // makes sure the row exists
        LocalDate today = ErpSupport.today();
        String col = me.role() == Role.HOD ? "hod" : "dean";
        db.sql("UPDATE performance_reviews SET " + col + "_remarks = ?, " + col + "_by = ?, " + col + "_at = now() "
                        + "WHERE user_id = ? AND academic_year = ? AND term = ?")
                .params(text, me.name(), userId, ErpSupport.academicYear(today), ErpSupport.term(today)).update();
        audit.record(me.username(), me.name(), "PERFORMANCE_REMARKS", String.valueOf(userId),
                "Added " + col.toUpperCase() + " remarks to a faculty scorecard.", http.getRemoteAddr());
        return scorecard(userId);
    }

    // ---------------------------------------------------------------- calculation

    /** Calculates the faculty member's scorecard for the current term and stores it. */
    Scorecard scorecard(long userId) {
        Map<String, Object> u = db.sql("SELECT username, display_name, dept_key FROM users WHERE id = ?").param(userId).query().singleRow();
        LocalDate today = ErpSupport.today();
        String year = ErpSupport.academicYear(today);
        String term = ErpSupport.term(today);
        List<Map<String, Object>> subjects = db.sql("SELECT dept_key, semester, subject_code FROM faculty_subjects WHERE user_id = ?")
                .param(userId).query().listOfRows();
        String subjectsSql = "(SELECT dept_key, semester, subject_code FROM faculty_subjects WHERE user_id = :uid)";

        Map<String, Double> score = new LinkedHashMap<>();
        Map<String, String> detail = new LinkedHashMap<>();

        Map<String, Object> pass = db.sql("""
                        SELECT count(*) AS n, count(*) FILTER (WHERE m.passed) AS p FROM marks m
                        WHERE m.assessment_type = 'End Semester' AND (m.dept_key, m.semester, m.subject_code) IN """ + subjectsSql)
                .param("uid", userId).query().singleRow();
        long n = ((Number) pass.get("n")).longValue();
        if (n > 0) {
            score.put("PASS_PCT", ((Number) pass.get("p")).doubleValue() * 100 / n);
            detail.put("PASS_PCT", pass.get("p") + " of " + n + " passed");
        }

        Map<String, Object> iat = db.sql("""
                        SELECT count(*) AS n, avg(m.grand_total) AS a FROM marks m
                        WHERE m.assessment_type IN ('IAT-1', 'IAT-2') AND (m.dept_key, m.semester, m.subject_code) IN """ + subjectsSql)
                .param("uid", userId).query().singleRow();
        if (((Number) iat.get("n")).longValue() > 0) {
            double a = ((Number) iat.get("a")).doubleValue();
            score.put("INTERNAL_AVG", a);
            detail.put("INTERNAL_AVG", "IAT average " + round(a) + " / 100");
        }

        int topics = 0;
        int covered = 0;
        for (Map<String, Object> s : subjects) {
            int[] c = db.sql("""
                            SELECT count(t.id), count(t.id) FILTER (WHERE EXISTS (SELECT 1 FROM logbook_entries e WHERE e.topic_id = t.id))
                            FROM syllabus_units su JOIN syllabus_topics t ON t.unit_id = su.id
                            WHERE su.dept_key = ? AND su.semester = ? AND su.subject_code = ?
                            """).params(s.get("dept_key"), s.get("semester"), s.get("subject_code"))
                    .query((rs, k) -> new int[] {rs.getInt(1), rs.getInt(2)}).single();
            topics += c[0];
            covered += c[1];
        }
        if (topics > 0) {
            score.put("SYLLABUS", covered * 100.0 / topics);
            detail.put("SYLLABUS", covered + " of " + topics + " topics covered");
        }

        if (!subjects.isEmpty()) {
            LocalDate start = ErpSupport.termStart(today);
            int working = 0;
            for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(1)) if (d.getDayOfWeek() != DayOfWeek.SUNDAY) working++;
            int logged = db.sql("SELECT count(DISTINCT entry_date) FROM logbook_entries WHERE faculty_id = ? AND entry_date BETWEEN ? AND ?")
                    .params(userId, start, today).query(Integer.class).single();
            if (working > 0) {
                score.put("LOGBOOK", Math.min(100, logged * 100.0 / working));
                detail.put("LOGBOOK", logged + " of " + working + " working days logged");
            }
        }

        BigDecimal leaveDays = db.sql("""
                        SELECT coalesce(sum(days), 0) FROM leave_requests
                        WHERE applicant_id = ? AND status = 'APPROVED' AND leave_code <> 'OD' AND academic_year = ?
                        """).params(userId, year).query(BigDecimal.class).single();
        score.put("LEAVE", Math.max(0, 100 - leaveDays.doubleValue() * 5));
        detail.put("LEAVE", leaveDays.stripTrailingZeros().toPlainString() + " leave days this year");

        if (!subjects.isEmpty()) {
            int forwarded = db.sql("""
                            SELECT count(*) FROM faculty_subjects f WHERE f.user_id = ? AND EXISTS (SELECT 1 FROM result_batches b
                              WHERE b.dept_key = f.dept_key AND b.semester = f.semester AND b.subject_code = f.subject_code
                                AND b.forwarded_at IS NOT NULL)
                            """).param(userId).query(Integer.class).single();
            score.put("MARKS_ON_TIME", forwarded * 100.0 / subjects.size());
            detail.put("MARKS_ON_TIME", forwarded + " of " + subjects.size() + " subjects forwarded");
        }

        Map<String, Object> fb = db.sql("""
                        SELECT count(v) AS n, avg(v::numeric) AS a
                        FROM co_entries c, jsonb_array_elements_text(c.marks) v
                        WHERE c.component = 'EXIT_SURVEY' AND v IS NOT NULL AND v ~ '^[0-9.]+$'
                          AND (c.dept_key, c.semester, c.subject_code) IN """ + subjectsSql)
                .param("uid", userId).query().singleRow();
        if (((Number) fb.get("n")).longValue() > 0) {
            double a = ((Number) fb.get("a")).doubleValue();
            score.put("FEEDBACK", a * 20);
            detail.put("FEEDBACK", "Average rating " + round(a) + " / 5 (" + fb.get("n") + " ratings)");
        }

        List<Measure> measures = db.sql("SELECT code, name, description, weight FROM performance_measures ORDER BY sort_order")
                .query((rs, k) -> new Measure(rs.getString(1), rs.getString(2), rs.getString(3), rs.getBigDecimal(4))).list();
        List<Score> scores = new ArrayList<>();
        double weighted = 0;
        double weights = 0;
        for (Measure m : measures) {
            Double s = score.get(m.code());
            Double r = s == null ? null : round(Math.max(0, Math.min(100, s)));
            scores.add(new Score(m.code(), m.name(), m.weight(), r, detail.getOrDefault(m.code(), "No data yet")));
            if (r != null && m.weight().signum() > 0) {
                weighted += r * m.weight().doubleValue();
                weights += m.weight().doubleValue();
            }
        }
        Double total = weights == 0 ? null : round(weighted / weights);
        db.sql("""
                        INSERT INTO performance_reviews (user_id, academic_year, term, scores, total, computed_at)
                        VALUES (?, ?, ?, CAST(? AS JSONB), ?, now())
                        ON CONFLICT (user_id, academic_year, term) DO UPDATE SET scores = EXCLUDED.scores, total = EXCLUDED.total,
                            computed_at = now()
                        """).params(userId, year, term, json.writeValueAsString(scores), total == null ? 0 : total).update();
        Map<String, Object> r = db.sql("SELECT * FROM performance_reviews WHERE user_id = ? AND academic_year = ? AND term = ?")
                .params(userId, year, term).query().singleRow();
        return new Scorecard(userId, (String) u.get("username"), (String) u.get("display_name"), (String) u.get("dept_key"),
                year, term, total, scores, (String) r.get("hod_remarks"), (String) r.get("hod_by"), (String) r.get("dean_remarks"),
                (String) r.get("dean_by"), ErpSupport.display(r.get("computed_at") instanceof java.sql.Timestamp ts
                        ? ts.toInstant().atOffset(java.time.ZoneOffset.UTC) : (OffsetDateTime) r.get("computed_at")));
    }

    private static double round(double v) {
        return Math.round(v * 10) / 10.0;
    }
}
