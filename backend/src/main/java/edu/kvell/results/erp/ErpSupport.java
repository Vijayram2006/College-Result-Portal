package edu.kvell.results.erp;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * Shared rules of the ERP components: the academic year and term, small settings (erp_settings), role checks and
 * the class in-charge lookup (permissions come from the in-charge assignment of each class, not from the login role).
 */
@Component
public class ErpSupport {

    public static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private final JdbcClient db;

    public ErpSupport(JdbcClient db) {
        this.db = db;
    }

    public static LocalDate today() {
        return LocalDate.now(IST);
    }

    /** "2026-2027": the academic year starts in June. */
    public static String academicYear(LocalDate d) {
        int y = d.getMonthValue() >= 6 ? d.getYear() : d.getYear() - 1;
        return y + "-" + (y + 1);
    }

    public static String academicYear() {
        return academicYear(today());
    }

    /** ODD term June to November, EVEN term December to May. */
    public static String term(LocalDate d) {
        int m = d.getMonthValue();
        return m >= 6 && m <= 11 ? "ODD" : "EVEN";
    }

    /** First day of the term that contains d. */
    public static LocalDate termStart(LocalDate d) {
        if ("ODD".equals(term(d))) return LocalDate.of(d.getYear(), 6, 1);
        return d.getMonthValue() == 12 ? LocalDate.of(d.getYear(), 12, 1) : LocalDate.of(d.getYear() - 1, 12, 1);
    }

    /** A timestamp as the screens show it. */
    public static String display(java.time.OffsetDateTime t) {
        return edu.kvell.results.common.Semesters.display(t);
    }

    public int intSetting(String key, int fallback) {
        return db.sql("SELECT value FROM erp_settings WHERE key = ?").param(key).query(String.class).optional()
                .map(v -> {
                    try {
                        return Integer.parseInt(v.trim());
                    } catch (NumberFormatException e) {
                        return fallback;
                    }
                }).orElse(fallback);
    }

    public boolean boolSetting(String key) {
        return db.sql("SELECT value FROM erp_settings WHERE key = ?").param(key).query(String.class).optional()
                .map(v -> v.trim().equalsIgnoreCase("true")).orElse(false);
    }

    public static CurrentUser require(Role... roles) {
        CurrentUser user = CurrentUser.get();
        if (Arrays.stream(roles).noneMatch(r -> r == user.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this");
        }
        return user;
    }

    /** A class: department, semester and section. */
    public record ClassKey(String deptKey, int semester, String section) {
    }

    /**
     * The faculty member who is in-charge of a class today: a temporary in-charge whose dates cover today (while the
     * regular one is on leave), otherwise the regular in-charge.
     */
    public Optional<Long> currentIncharge(String deptKey, int semester, String section) {
        return db.sql("""
                        SELECT faculty_user_id FROM class_incharge
                        WHERE dept_key = ? AND semester = ? AND section = ? AND from_date <= current_date
                          AND (to_date IS NULL OR to_date >= current_date)
                        ORDER BY temporary DESC, from_date DESC, id DESC LIMIT 1
                        """).params(deptKey, semester, section).query(Long.class).optional();
    }

    /** True when the user is today's in-charge of the class. */
    public boolean isIncharge(long userId, String deptKey, int semester, String section) {
        return currentIncharge(deptKey, semester, section).map(id -> id == userId).orElse(false);
    }

    /** The class of a student. */
    public ClassKey classOf(String regNo) {
        return db.sql("SELECT dept_key, semester, section FROM students WHERE reg_no = ?").param(regNo)
                .query((rs, n) -> new ClassKey(rs.getString(1), rs.getInt(2), rs.getString(3))).optional()
                .orElseThrow(() -> ApiException.notFound("Student not found"));
    }
}
