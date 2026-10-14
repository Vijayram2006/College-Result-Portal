package edu.kvell.results.seed;

import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the staff logins: the Super Admin (SATHISH, overall university COE), one Controller of Examinations per
 * college (ADMIN for Engineering, COE_NURSING, COE_PHARMACY), and per department one HOD (HODCSE, ...) and one
 * faculty login (FACCSE, ...). Students, subjects and marks are entered through the portal.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final JdbcClient db;
    private final PasswordEncoder encoder;
    private final boolean enabled;
    private final String adminPassword;
    private final String hodPassword;
    private final String facultyPassword;
    private final String nursingCoePassword;
    private final String pharmacyCoePassword;
    private final String superAdminPassword;

    public DemoDataSeeder(JdbcClient db, PasswordEncoder encoder,
                          @Value("${app.seed.enabled}") boolean enabled,
                          @Value("${app.seed.admin-password}") String adminPassword,
                          @Value("${app.seed.hod-password}") String hodPassword,
                          @Value("${app.seed.faculty-password}") String facultyPassword,
                          @Value("${app.seed.nursing-coe-password}") String nursingCoePassword,
                          @Value("${app.seed.pharmacy-coe-password}") String pharmacyCoePassword,
                          @Value("${app.seed.super-admin-password:}") String superAdminPassword) {
        this.db = db;
        this.encoder = encoder;
        this.enabled = enabled;
        this.adminPassword = adminPassword;
        this.hodPassword = hodPassword;
        this.facultyPassword = facultyPassword;
        this.nursingCoePassword = nursingCoePassword;
        this.pharmacyCoePassword = pharmacyCoePassword;
        this.superAdminPassword = superAdminPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) return;
        createSuperAdmin("SATHISH", "Dr. Sathish", superAdminPassword);
        createCoe("ADMIN", "Dr. Controller of Examinations (Engineering)", "engineering", adminPassword);
        createCoe("COE_NURSING", "Dr. Controller of Examinations (Nursing)", "nursing", nursingCoePassword);
        createCoe("COE_PHARMACY", "Dr. Controller of Examinations (Pharmacy)", "pharmacy", pharmacyCoePassword);
        List<String> depts = db.sql("SELECT dept_key FROM departments ORDER BY dept_key").query(String.class).list();
        depts.forEach(this::createDepartmentLogins);
    }

    private void createCoe(String username, String name, String college, String password) {
        if (exists(username)) return;
        if (!usable(password)) {
            log.warn("No password configured for {}; that login was not created", username);
            return;
        }
        // The starting password is shared configuration, so the COE must choose their own at first sign-in
        db.sql("""
                        INSERT INTO users (username, password_hash, role, display_name, college_key, must_change_password)
                        VALUES (?, ?, 'ADMIN', ?, ?, TRUE)
                        """)
                .params(username, encoder.encode(password), name, college).update();
        log.info("Created COE login {}", username);
    }

    private void createSuperAdmin(String username, String name, String password) {
        if (exists(username)) return;
        if (!usable(password)) {
            log.warn("No password configured for the Super Admin {}; that login was not created", username);
            return;
        }
        db.sql("""
                        INSERT INTO users (username, password_hash, role, display_name, email, must_change_password)
                        VALUES (?, ?, 'SUPER_ADMIN', ?, 'coe.sathish@kvell.edu.in', TRUE)
                        """)
                .params(username, encoder.encode(password), name).update();
        log.info("Created Super Admin login {}", username);
    }

    /** HOD<DEPT> and FAC<DEPT> logins for a department, when missing (also called when a COE adds a department). */
    public void createDepartmentLogins(String dept) {
        if (!enabled) return;
        String code = dept.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        createDeptUser("HOD" + code, "HOD", "Head of Department (" + code + ")", dept, hodPassword);
        createDeptUser("FAC" + code, "FACULTY", "Faculty Evaluator (" + code + ")", dept, facultyPassword);
    }

    private void createDeptUser(String username, String role, String name, String dept, String password) {
        if (exists(username)) return;
        if (!usable(password)) {
            log.warn("No password configured for {} logins; {} was not created", role, username);
            return;
        }
        // Every HOD (and every faculty login) starts with the same password, so each must choose their own first
        db.sql("""
                        INSERT INTO users (username, password_hash, role, display_name, dept_key, must_change_password)
                        VALUES (?, ?, ?, ?, ?, TRUE)
                        """)
                .params(username, encoder.encode(password), role, name, dept).update();
        log.info("Created {} login {}", role, username);
    }

    private boolean exists(String username) {
        return db.sql("SELECT count(*) FROM users WHERE username = ?").param(username).query(Integer.class).single() > 0;
    }

    private static boolean usable(String password) {
        return password != null && password.length() >= 8;
    }
}
