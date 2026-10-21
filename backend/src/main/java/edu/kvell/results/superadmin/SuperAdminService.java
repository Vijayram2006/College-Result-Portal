package edu.kvell.results.superadmin;

import edu.kvell.results.auth.AuthService;
import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import edu.kvell.results.governance.GovernanceService;
import edu.kvell.results.governance.SystemConfig;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Super Admin console: officer accounts (college COEs, deputies, other Super Admins), a per-college overview,
 * the audit trail of every college, and database statistics.
 */
@Service
public class SuperAdminService {

    /** Matches the admin panel's OfficerUser. role: SUPER_ADMIN, COE_ENGINEERING / NURSING / PHARMACY, DEPUTY_COE. */
    public record Officer(String id, String name, String username, String email, String role, String collegeKey,
                          String status, String lastLogin, String departmentScope, boolean mustChangePassword,
                          boolean mfaEnabled) {
    }

    public record CreateOfficer(String name, String username, String email, String role, String collegeKey,
                                String password) {
    }

    public record StatusChange(String status) {
    }

    public record PasswordReset(String password) {
    }

    /** One college on the overview. */
    public record CollegeOverview(String key, String name, String coeName, int departments, int students,
                                  int studentsWithoutDob, int subjects, int marksEntered, int expectedScripts,
                                  int publishedBatches, int awaitingPublish, int publishedRecords,
                                  double passPercentage, SystemConfig.CollegeLock lock) {
    }

    public record AuditEntry(String id, String college, String actor, String actorName, String action, String target,
                             String description, String ipAddress, String timestamp) {
    }

    public record TableStat(String table, String label, long rows, long bytes) {
    }

    public record StorageStats(long databaseBytes, List<TableStat> tables, String configUpdatedBy,
                               String configUpdatedAt) {
    }

    private static final Map<String, String> COLLEGE_NAMES = Map.of(
            "engineering", "Karpaga Vinayaga College of Engineering and Technology",
            "nursing", "Karpaga Vinayaga College of Nursing",
            "pharmacy", "Karpaga Vinayaga Institute for Pharmaceutical Sciences");
    private static final Set<String> OFFICER_ROLES =
            Set.of("SUPER_ADMIN", "COE_ENGINEERING", "COE_NURSING", "COE_PHARMACY", "DEPUTY_COE", "ASSOCIATE_DEAN",
                    "DEAN", "ADMISSION_OFFICER");
    /** Officer kinds that belong to one chosen college (the COE kinds carry the college in their name). */
    private static final Set<String> COLLEGE_CHOSEN = Set.of("DEPUTY_COE", "ASSOCIATE_DEAN", "DEAN", "ADMISSION_OFFICER");
    /** Tables shown on the storage tab (fixed list, so the names can be used in SQL). */
    private static final Map<String, String> TABLES = new LinkedHashMap<>();

    static {
        TABLES.put("students", "Students");
        TABLES.put("subjects", "Subjects");
        TABLES.put("marks", "Answer-script marks");
        TABLES.put("result_batches", "Result batches");
        TABLES.put("result_records", "Published result records");
        TABLES.put("answer_scripts", "Scanned answer scripts (PDF)");
        TABLES.put("users", "Accounts");
        TABLES.put("departments", "Departments");
        TABLES.put("audit_logs", "Audit log");
        TABLES.put("notifications", "Notifications");
        TABLES.put("revaluation_requests", "Revaluation requests");
    }

    private final JdbcClient db;
    private final PasswordEncoder encoder;
    private final AuditService audit;
    private final GovernanceService governance;

    public SuperAdminService(JdbcClient db, PasswordEncoder encoder, AuditService audit, GovernanceService governance) {
        this.db = db;
        this.encoder = encoder;
        this.audit = audit;
        this.governance = governance;
    }

    // ---- Officer accounts ----

    public List<Officer> officers() {
        return db.sql("""
                        SELECT id, username, display_name, email, role, college_key, officer_title, enabled,
                               last_login_at, must_change_password, totp_enabled
                        FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'DEAN', 'ADMISSION')
                        ORDER BY (role = 'SUPER_ADMIN') DESC, college_key, (officer_title IS NOT NULL), username
                        """)
                .query((rs, n) -> {
                    String role = rs.getString("role");
                    String college = rs.getString("college_key");
                    String title = rs.getString("officer_title");
                    String shown = "SUPER_ADMIN".equals(role) ? "SUPER_ADMIN"
                            : "DEAN".equals(role) ? (title == null ? "ASSOCIATE_DEAN" : title)
                            : "ADMISSION".equals(role) ? "ADMISSION_OFFICER"
                            : "DEPUTY_COE".equals(title) ? "DEPUTY_COE"
                            : "COE_" + (college == null ? "ENGINEERING" : college.toUpperCase(Locale.ROOT));
                    OffsetDateTime last = rs.getObject("last_login_at", OffsetDateTime.class);
                    return new Officer(String.valueOf(rs.getLong("id")), rs.getString("display_name"),
                            rs.getString("username"), rs.getString("email") == null ? "" : rs.getString("email"),
                            shown, "SUPER_ADMIN".equals(role) ? "all" : college,
                            rs.getBoolean("enabled") ? "ACTIVE" : "SUSPENDED",
                            last == null ? "Never" : Semesters.display(last),
                            "SUPER_ADMIN".equals(role) ? "Central University - all colleges"
                                    : COLLEGE_NAMES.getOrDefault(college, college),
                            rs.getBoolean("must_change_password"), rs.getBoolean("totp_enabled"));
                })
                .list();
    }

    /**
     * Clears an officer's two-step sign-in (a lost phone): they set it up again at their next sign-in, and every
     * session of theirs ends. The Chief COE cannot reset their own here, so one account can never clear its own
     * second factor.
     */
    @Transactional
    public Officer resetMfa(long id, CurrentUser by, String ip) {
        Map<String, Object> target = officer(id);
        String username = (String) target.get("username");
        if (((Number) target.get("id")).longValue() == by.id()) {
            throw ApiException.badRequest("Another Chief COE or the system administrator must reset your own two-step sign-in");
        }
        db.sql("""
                        UPDATE users SET totp_enabled = FALSE, totp_secret = NULL, totp_last_step = NULL,
                                         totp_recovery = NULL WHERE id = ?
                        """)
                .param(id).update();
        db.sql("DELETE FROM auth_tokens WHERE user_id = ?").param(id).update();
        audit.record(by.username(), by.name(), "RESET_OFFICER_MFA", username,
                "Cleared two-step sign-in for " + username + "; they must set it up again at next sign-in.", ip,
                "two-step sign-in on", "two-step sign-in cleared");
        return officers().stream().filter(o -> o.id().equals(String.valueOf(id))).findFirst().orElseThrow();
    }

    @Transactional
    public Officer create(CreateOfficer req, CurrentUser by, String ip) {
        if (req == null) throw ApiException.badRequest("Officer details are required");
        String username = AuthService.normalize(req.username());
        if (!username.matches("[A-Z0-9_]{3,40}")) {
            throw ApiException.badRequest("Username: 3-40 letters, digits or underscores");
        }
        String name = req.name() == null ? "" : req.name().trim();
        if (name.isEmpty() || name.length() > 120) throw ApiException.badRequest("Name is required (up to 120 characters)");
        String email = req.email() == null ? "" : req.email().trim();
        if (!email.isEmpty() && (email.length() > 160 || !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"))) {
            throw ApiException.badRequest("Enter a valid email address");
        }
        String role = req.role() == null ? "" : req.role().trim().toUpperCase(Locale.ROOT);
        if (!OFFICER_ROLES.contains(role)) throw ApiException.badRequest("Unknown officer role");
        String password = req.password() == null ? "" : req.password();
        String problem = AuthService.passwordProblem(password, "", username);
        if (problem != null) throw ApiException.badRequest(problem.replace("The new password", "The starting password"));
        if (db.sql("SELECT count(*) FROM users WHERE username = ?").param(username).query(Integer.class).single() > 0) {
            throw ApiException.conflict("The username " + username + " is already taken");
        }

        String dbRole = switch (role) {
            case "SUPER_ADMIN" -> "SUPER_ADMIN";
            case "ASSOCIATE_DEAN", "DEAN" -> "DEAN";
            case "ADMISSION_OFFICER" -> "ADMISSION";
            default -> "ADMIN";
        };
        String college = "SUPER_ADMIN".equals(role) ? null
                : COLLEGE_CHOSEN.contains(role) ? college(req.collegeKey())
                : role.substring("COE_".length()).toLowerCase(Locale.ROOT);
        String title = switch (role) {
            case "DEPUTY_COE", "ASSOCIATE_DEAN", "DEAN" -> role;
            default -> null;
        };
        // The Super Admin chooses the starting password, so the officer must replace it at first sign-in
        db.sql("""
                        INSERT INTO users (username, password_hash, role, display_name, email, college_key, officer_title,
                                           must_change_password)
                        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
                        """)
                .params(username, encoder.encode(password), dbRole, name, email.isEmpty() ? null : email, college,
                        title)
                .update();
        audit.record(by.username(), by.name(), "PROVISIONED_OFFICER", username,
                "Created " + role + " account " + username + " (" + name + ")"
                        + (college == null ? "" : " for " + college) + ".", ip);
        return officers().stream().filter(o -> o.username().equals(username)).findFirst().orElseThrow();
    }

    @Transactional
    public Officer setStatus(long id, StatusChange req, CurrentUser by, String ip) {
        String status = req == null || req.status() == null ? "" : req.status().trim().toUpperCase(Locale.ROOT);
        if (!status.equals("ACTIVE") && !status.equals("SUSPENDED")) throw ApiException.badRequest("Unknown status");
        Map<String, Object> target = officer(id);
        if (by.id() == id) throw ApiException.badRequest("You cannot suspend your own account");
        boolean suspend = status.equals("SUSPENDED");
        if (suspend && "SUPER_ADMIN".equals(target.get("role")) && activeSuperAdmins() <= 1) {
            throw ApiException.badRequest("At least one Super Admin must stay active");
        }
        db.sql("UPDATE users SET enabled = ? WHERE id = ?").params(!suspend, id).update();
        // A suspended account is signed out everywhere at once
        if (suspend) db.sql("DELETE FROM auth_tokens WHERE user_id = ?").param(id).update();
        audit.record(by.username(), by.name(), suspend ? "SUSPENDED_OFFICER" : "REACTIVATED_OFFICER",
                (String) target.get("username"),
                (suspend ? "Suspended " : "Reactivated ") + target.get("username") + ".", ip);
        return officers().stream().filter(o -> o.id().equals(String.valueOf(id))).findFirst().orElseThrow();
    }

    @Transactional
    public Officer resetPassword(long id, PasswordReset req, CurrentUser by, String ip) {
        Map<String, Object> target = officer(id);
        String username = (String) target.get("username");
        String password = req == null || req.password() == null ? "" : req.password();
        String problem = AuthService.passwordProblem(password, "", username);
        if (problem != null) throw ApiException.badRequest(problem);
        db.sql("UPDATE users SET password_hash = ?, must_change_password = TRUE WHERE id = ?")
                .params(encoder.encode(password), id).update();
        db.sql("DELETE FROM auth_tokens WHERE user_id = ?").param(id).update();
        audit.record(by.username(), by.name(), "RESET_OFFICER_PASSWORD", username,
                "Set a new starting password for " + username + "; they must change it at next sign-in.", ip);
        return officers().stream().filter(o -> o.id().equals(String.valueOf(id))).findFirst().orElseThrow();
    }

    private Map<String, Object> officer(long id) {
        List<Map<String, Object>> rows = db.sql(
                        "SELECT id, username, role FROM users WHERE id = ? AND role IN ('SUPER_ADMIN', 'ADMIN', 'DEAN', 'ADMISSION')")
                .param(id).query().listOfRows();
        if (rows.isEmpty()) throw notFound();
        return rows.getFirst();
    }

    private int activeSuperAdmins() {
        return db.sql("SELECT count(*) FROM users WHERE role = 'SUPER_ADMIN' AND enabled").query(Integer.class).single();
    }

    private static String college(String key) {
        String k = key == null ? "" : key.trim().toLowerCase(Locale.ROOT);
        if (!Departments.COLLEGES.contains(k)) throw ApiException.badRequest("Choose the officer's college");
        return k;
    }

    // ---- Overview, audit, storage ----

    public List<CollegeOverview> overview() {
        SystemConfig config = governance.current();
        List<CollegeOverview> out = new ArrayList<>();
        for (String college : List.of("engineering", "nursing", "pharmacy")) {
            Map<String, Object> r = db.sql("""
                            WITH d AS (SELECT dept_key FROM departments WHERE college_key = :c)
                            SELECT
                              (SELECT count(*) FROM d) AS departments,
                              (SELECT count(*) FROM students WHERE dept_key IN (SELECT dept_key FROM d)) AS students,
                              (SELECT count(*) FROM students WHERE dept_key IN (SELECT dept_key FROM d) AND dob IS NULL)
                                  AS no_dob,
                              (SELECT count(*) FROM subjects WHERE dept_key IN (SELECT dept_key FROM d)) AS subjects,
                              (SELECT count(*) FROM marks WHERE dept_key IN (SELECT dept_key FROM d)) AS marks,
                              (SELECT coalesce(sum((SELECT count(*) FROM students s
                                                    WHERE s.dept_key = j.dept_key AND s.semester = j.semester)), 0)
                                 FROM subjects j WHERE j.dept_key IN (SELECT dept_key FROM d)) AS expected,
                              (SELECT count(*) FROM result_batches
                                 WHERE status = 'PUBLISHED' AND dept_key IN (SELECT dept_key FROM d)) AS published,
                              (SELECT count(*) FROM result_batches
                                 WHERE status = 'VALIDATED' AND dept_key IN (SELECT dept_key FROM d)) AS awaiting,
                              (SELECT count(*) FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                                 WHERE b.status = 'PUBLISHED' AND b.dept_key IN (SELECT dept_key FROM d)) AS records,
                              (SELECT count(*) FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                                 WHERE b.status = 'PUBLISHED' AND r.passed AND b.dept_key IN (SELECT dept_key FROM d))
                                  AS passed,
                              (SELECT string_agg(display_name, ', ' ORDER BY username) FROM users
                                 WHERE role = 'ADMIN' AND college_key = :c AND officer_title IS NULL) AS coe
                            """)
                    .param("c", college).query().singleRow();
            int records = num(r.get("records"));
            out.add(new CollegeOverview(college, COLLEGE_NAMES.get(college),
                    r.get("coe") == null ? "—" : (String) r.get("coe"), num(r.get("departments")),
                    num(r.get("students")), num(r.get("no_dob")), num(r.get("subjects")), num(r.get("marks")),
                    num(r.get("expected")), num(r.get("published")), num(r.get("awaiting")), records,
                    records == 0 ? 0 : Math.round(num(r.get("passed")) * 1000.0 / records) / 10.0,
                    config.institutionalLocks().get(college)));
        }
        return out;
    }

    public List<AuditEntry> auditTrail(int limit) {
        int n = Math.max(1, Math.min(limit, 2000));
        return db.sql("""
                        SELECT id, college_key, actor, actor_name, action, target, description, ip_address, created_at
                        FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ?
                        """)
                .param(n)
                .query((rs, i) -> new AuditEntry("LOG-" + rs.getLong("id"), rs.getString("college_key"),
                        rs.getString("actor"), rs.getString("actor_name"), rs.getString("action"),
                        rs.getString("target"), rs.getString("description"), rs.getString("ip_address"),
                        Semesters.display(rs.getObject("created_at", OffsetDateTime.class))))
                .list();
    }

    public StorageStats storage() {
        List<TableStat> tables = new ArrayList<>();
        TABLES.forEach((table, label) -> {
            // table names come from the fixed list above, never from the request
            long rows = db.sql("SELECT count(*) FROM " + table).query(Long.class).single();
            long bytes = db.sql("SELECT pg_total_relation_size(CAST(? AS regclass))").param(table)
                    .query(Long.class).single();
            tables.add(new TableStat(table, label, rows, bytes));
        });
        long dbBytes = db.sql("SELECT pg_database_size(current_database())").query(Long.class).single();
        var row = db.sql("SELECT updated_by, updated_at FROM system_config WHERE id = 1")
                .query((rs, i) -> new String[] {rs.getString("updated_by"),
                        Semesters.display(rs.getObject("updated_at", OffsetDateTime.class))})
                .optional().orElse(new String[] {"System default", "—"});
        return new StorageStats(dbBytes, tables, row[0], row[1]);
    }

    private static int num(Object v) {
        return v == null ? 0 : ((Number) v).intValue();
    }

    /** Thrown for a missing officer id. */
    static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "Officer not found");
    }
}
