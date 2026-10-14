package edu.kvell.results.departments;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.seed.DemoDataSeeder;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The COE's departments (Departments page). Each COE only sees and changes its own college's departments. */
@RestController
@RequestMapping("/api/admin/departments")
public class DepartmentController {

    /** Matches the admin panel's DepartmentRecord. */
    /** hodLogin / facultyLogin: the department's HOD and faculty usernames (null if none). */
    public record DepartmentView(String id, String key, String name, String code, String headName, int totalStudents,
                                 String status, String hodLogin, String facultyLogin) {
    }

    public record DepartmentInput(String key, String name, String code, String headName, String status) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final DemoDataSeeder logins;

    public DepartmentController(JdbcClient db, Departments departments, AuditService audit, DemoDataSeeder logins) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
        this.logins = logins;
    }

    @GetMapping
    List<DepartmentView> list() {
        return db.sql("""
                        SELECT d.dept_key, d.name, coalesce(d.code, upper(d.dept_key)) AS code,
                               coalesce(d.head_name, '') AS head_name, d.status,
                               (SELECT count(*) FROM students s WHERE s.dept_key = d.dept_key) AS students,
                               (SELECT u.username FROM users u WHERE u.dept_key = d.dept_key AND u.role = 'HOD'
                                ORDER BY u.id LIMIT 1) AS hod_login,
                               (SELECT u.username FROM users u WHERE u.dept_key = d.dept_key AND u.role = 'FACULTY'
                                ORDER BY u.id LIMIT 1) AS faculty_login
                        FROM departments d WHERE d.college_key = ? ORDER BY d.name
                        """)
                .param(departments.college())
                .query((rs, n) -> new DepartmentView(rs.getString("dept_key"), rs.getString("dept_key"),
                        rs.getString("name"), rs.getString("code"), rs.getString("head_name"), rs.getInt("students"),
                        rs.getString("status"), rs.getString("hod_login"), rs.getString("faculty_login")))
                .list();
    }

    @PostMapping
    @Transactional
    ResponseEntity<DepartmentView> create(@RequestBody DepartmentInput in, HttpServletRequest http) {
        String key = in == null || in.key() == null ? "" : in.key().trim().toLowerCase(Locale.ROOT);
        if (!key.matches("[a-z0-9]{2,10}")) {
            throw ApiException.badRequest("Department key must be 2-10 letters or digits (for example: msn)");
        }
        String name = required(in.name(), "Department name");
        int taken = db.sql("SELECT count(*) FROM departments WHERE dept_key = ?").param(key).query(Integer.class).single();
        if (taken > 0) throw ApiException.conflict("The department key '" + key + "' is already in use.");
        db.sql("""
                        INSERT INTO departments (dept_key, name, code, head_name, status, college_key)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """)
                .params(key, name, code(in, key), trim(in.headName()), status(in.status()), departments.college())
                .update();
        logins.createDepartmentLogins(key);
        CurrentUser user = CurrentUser.get();
        audit.record(user.username(), user.name(), "CREATED_DEPARTMENT", key.toUpperCase(Locale.ROOT) + " - " + name,
                "Added a department.", http.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(get(key));
    }

    @PutMapping("/{key}")
    @Transactional
    DepartmentView update(@PathVariable String key, @RequestBody DepartmentInput in, HttpServletRequest http) {
        String deptKey = departments.key(key);
        String name = required(in.name(), "Department name");
        db.sql("UPDATE departments SET name = ?, code = ?, head_name = ?, status = ? WHERE dept_key = ?")
                .params(name, code(in, deptKey), trim(in.headName()), status(in.status()), deptKey).update();
        CurrentUser user = CurrentUser.get();
        audit.record(user.username(), user.name(), "UPDATED_DEPARTMENT", deptKey.toUpperCase(Locale.ROOT),
                "Updated department details.", http.getRemoteAddr());
        return get(deptKey);
    }

    /** Only an empty department can be removed, so no students, marks or results are ever lost this way. */
    @DeleteMapping("/{key}")
    @Transactional
    ResponseEntity<Void> delete(@PathVariable String key, HttpServletRequest http) {
        String deptKey = departments.key(key);
        int used = db.sql("""
                        SELECT (SELECT count(*) FROM students WHERE dept_key = :k) + (SELECT count(*) FROM subjects WHERE dept_key = :k)
                             + (SELECT count(*) FROM marks WHERE dept_key = :k) + (SELECT count(*) FROM result_batches WHERE dept_key = :k)
                        """)
                .param("k", deptKey).query(Integer.class).single();
        if (used > 0) {
            throw ApiException.conflict("This department still has students, subjects or results. Remove them first.");
        }
        db.sql("DELETE FROM auth_tokens WHERE user_id IN (SELECT id FROM users WHERE dept_key = ?)").param(deptKey).update();
        db.sql("DELETE FROM users WHERE dept_key = ? AND role IN ('HOD', 'FACULTY')").param(deptKey).update();
        db.sql("DELETE FROM departments WHERE dept_key = ?").param(deptKey).update();
        CurrentUser user = CurrentUser.get();
        audit.record(user.username(), user.name(), "DELETED_DEPARTMENT", deptKey.toUpperCase(Locale.ROOT),
                "Removed an empty department and its HOD / faculty logins.", http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private DepartmentView get(String key) {
        return list().stream().filter(d -> d.key().equals(key)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Department not found"));
    }

    private static String code(DepartmentInput in, String key) {
        String code = trim(in.code());
        return code.isEmpty() ? key.toUpperCase(Locale.ROOT) : code.toUpperCase(Locale.ROOT);
    }

    private static String status(String status) {
        return "INACTIVE".equalsIgnoreCase(trim(status)) ? "INACTIVE" : "ACTIVE";
    }

    private static String required(String value, String label) {
        String v = trim(value);
        if (v.isEmpty()) throw ApiException.badRequest(label + " is required");
        if (v.length() > 120) throw ApiException.badRequest(label + " is too long");
        return v;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
