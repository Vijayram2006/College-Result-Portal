package edu.kvell.results.common;

import edu.kvell.results.auth.CurrentUser;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * The admin screens name departments inconsistently ("cse", "CSE", "Computer Science & Engineering",
 * "Electronics & Communication"); this maps any of them to the department key.
 *
 * <p>Every lookup is limited to the signed-in user's college, so a COE (or HOD / faculty member) can never read or
 * change another college's departments, even by sending its key directly.
 */
@Service
public class Departments {

    public static final Set<String> COLLEGES = Set.of("engineering", "nursing", "pharmacy");

    private final JdbcClient db;

    public Departments(JdbcClient db) {
        this.db = db;
    }

    public String key(String keyOrName) {
        if (keyOrName == null || keyOrName.isBlank()) throw ApiException.badRequest("Department is required");
        String v = keyOrName.trim().toLowerCase(Locale.ROOT);
        String college = CurrentUser.collegeOrNull();
        return db.sql("""
                        SELECT dept_key FROM departments
                        WHERE (dept_key = :v OR lower(name) = :v OR lower(code) = :v OR lower(name) LIKE :prefix)
                          AND (CAST(:college AS VARCHAR) IS NULL OR college_key = :college)
                        ORDER BY (dept_key = :v) DESC, (lower(name) = :v) DESC LIMIT 1
                        """)
                .param("v", v).param("prefix", v + "%").param("college", college)
                .query(String.class).optional()
                .orElseThrow(() -> ApiException.badRequest("Unknown department: " + keyOrName));
    }

    public String name(String key) {
        return db.sql("SELECT name FROM departments WHERE dept_key = ?").param(key).query(String.class).optional()
                .orElseThrow(() -> ApiException.notFound("Department not found"));
    }

    /** The signed-in user's college (validated), for queries that list data across departments. */
    public String college() {
        String college = CurrentUser.collegeOrNull();
        if (college == null || !COLLEGES.contains(college)) {
            throw new IllegalStateException("No college for the signed-in user");
        }
        return college;
    }

    /**
     * SQL condition limiting {@code column} (a dept_key column) to the signed-in user's college. The college comes
     * from the session and is checked against a fixed list, so inlining it is safe.
     */
    public String inCollege(String column) {
        // Padded with spaces: text blocks drop the trailing space of a line ending in "AND " before the concatenation
        return " " + column + " IN (SELECT dept_key FROM departments WHERE college_key = '" + college() + "') ";
    }
}
