package edu.kvell.results.facultymaster;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import jakarta.servlet.http.HttpServletRequest;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
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
 * The Associate Dean adds the college's faculty: the details go into the faculty master, are verified by the Dean
 * and become a faculty sign-in of their own (username = staff ID, a starting password to change at first sign-in).
 * Each faculty member belongs to one department and handles the subjects the Dean assigns; mark entry and the CO
 * sheet then show only those subjects.
 */
@RestController
@RequestMapping("/api/dean/faculty")
public class DeanFacultyController {

    public record HandlingSubject(String semester, String code, String title) {
    }

    public record SubjectInput(String semester, String code) {
    }

    public record FacultyAccount(long id, String title, String name, String staffId, String deptKey, String deptName,
                                 String designation, String mobile, String email, String username, boolean active,
                                 String verifiedBy, OffsetDateTime verifiedAt, List<HandlingSubject> subjects) {
    }

    public record NewFaculty(String title, String name, String staffId, String dept, String gender, String dob,
                             String designation, String joinedOn, String mobile, String email,
                             List<SubjectInput> subjects) {
    }

    /** startingPassword is shown to the Dean once, to hand over to the faculty member. */
    public record Created(FacultyAccount faculty, String startingPassword) {
    }

    public record DeptSubject(String semester, String code, String title) {
    }

    private static final Pattern STAFF_ID = Pattern.compile("[A-Za-z0-9._-]{3,30}");
    private static final Pattern MOBILE = Pattern.compile("[6-9][0-9]{9}");
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final PasswordEncoder encoder;

    public DeanFacultyController(JdbcClient db, Departments departments, AuditService audit, PasswordEncoder encoder) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
        this.encoder = encoder;
    }

    @GetMapping
    List<FacultyAccount> list() {
        return db.sql("""
                        SELECT f.id FROM faculty_master f JOIN departments d ON d.dept_key = f.dept_key
                        WHERE f.college_key = ? ORDER BY d.name, f.name
                        """).param(departments.college()).query(Long.class).list()
                .stream().map(this::account).toList();
    }

    /** The subjects of a department, for choosing the handling subjects. */
    @GetMapping("/subjects")
    List<DeptSubject> subjects(@RequestParam String dept) {
        return db.sql("SELECT semester, code, title FROM subjects WHERE dept_key = ? ORDER BY semester, code")
                .param(departments.key(dept))
                .query((rs, n) -> new DeptSubject(Semesters.label(rs.getInt(1)), rs.getString(2), rs.getString(3)))
                .list();
    }

    @PostMapping
    @Transactional
    Created create(@RequestBody NewFaculty in, HttpServletRequest http) {
        CurrentUser dean = CurrentUser.get();
        if (in == null) throw ApiException.badRequest("Faculty details are required");
        String title = req(in.title(), "Title");
        if (!FacultyMasterController.TITLES.contains(title)) throw ApiException.badRequest("Title must be Dr., Mr. or Ms.");
        String name = req(in.name(), "Name");
        if (name.length() > 120) throw ApiException.badRequest("Name is too long");
        String staffId = req(in.staffId(), "Staff ID").toUpperCase(Locale.ROOT);
        if (!STAFF_ID.matcher(staffId).matches()) {
            throw ApiException.badRequest("Staff ID: 3 to 30 letters, digits, '.', '_' or '-'");
        }
        String dept = departments.key(req(in.dept(), "Department"));
        String gender = req(in.gender(), "Gender");
        if (!FacultyMasterController.GENDERS.contains(gender)) throw ApiException.badRequest("Choose the gender");
        LocalDate dob = date(in.dob(), "Date of birth");
        LocalDate joined = date(in.joinedOn(), "Date of joining");
        String designation = req(in.designation(), "Designation");
        String mobile = req(in.mobile(), "Mobile");
        if (!MOBILE.matcher(mobile).matches()) throw ApiException.badRequest("Mobile must be a 10-digit Indian number");
        String email = in.email() == null || in.email().isBlank() ? null : in.email().trim();
        if (db.sql("SELECT count(*) FROM users WHERE lower(username) = lower(?)").param(staffId)
                .query(Integer.class).single() > 0) {
            throw ApiException.conflict("A sign-in named " + staffId + " already exists");
        }
        String password = startingPassword();
        long userId = db.sql("""
                        INSERT INTO users (username, password_hash, role, display_name, dept_key, email, must_change_password)
                        VALUES (?, ?, 'FACULTY', ?, ?, ?, TRUE) RETURNING id
                        """).params(staffId, encoder.encode(password), title + " " + name, dept, email)
                .query(Long.class).single();
        long id = db.sql("""
                        INSERT INTO faculty_master (college_key, dept_key, title, name, gender, dob, designation,
                            joined_service_on, joined_post_on, mobile, email, created_by, updated_by,
                            staff_id, user_id, verified_by, verified_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now()) RETURNING id
                        """).params(departments.college(), dept, title, name, gender, dob, designation, joined, joined,
                        mobile, email, dean.name(), dean.name(), staffId, userId, dean.name())
                .query(Long.class).single();
        saveSubjects(userId, dept, in.subjects());
        audit.record(dean.username(), dean.name(), "ADDED_FACULTY", staffId,
                "Verified and added " + title + " " + name + " (" + staffId + ", " + dept.toUpperCase(Locale.ROOT)
                        + ") as faculty with " + (in.subjects() == null ? 0 : in.subjects().size()) + " handling subjects.",
                http.getRemoteAddr());
        return new Created(account(id), password);
    }

    @PutMapping("/{id}/subjects")
    @Transactional
    FacultyAccount setSubjects(@PathVariable long id, @RequestBody List<SubjectInput> subjects, HttpServletRequest http) {
        CurrentUser dean = CurrentUser.get();
        FacultyAccount f = account(id);
        if (f.username() == null) throw ApiException.badRequest("This faculty member has no sign-in yet");
        long userId = db.sql("SELECT user_id FROM faculty_master WHERE id = ?").param(id).query(Long.class).single();
        db.sql("DELETE FROM faculty_subjects WHERE user_id = ?").param(userId).update();
        saveSubjects(userId, f.deptKey(), subjects);
        audit.record(dean.username(), dean.name(), "SET_HANDLING_SUBJECTS", f.staffId(),
                "Set the handling subjects of " + f.name() + ": "
                        + (subjects == null ? "none" : subjects.stream().map(SubjectInput::code).toList()) + ".",
                http.getRemoteAddr());
        return account(id);
    }

    private void saveSubjects(long userId, String dept, List<SubjectInput> subjects) {
        if (subjects == null) return;
        if (subjects.size() > 20) throw ApiException.badRequest("At most 20 handling subjects");
        for (SubjectInput s : subjects) {
            if (s == null || s.code() == null) continue;
            int sem = Semesters.parse(s.semester());
            String code = s.code().trim().toUpperCase(Locale.ROOT);
            if (db.sql("SELECT count(*) FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?")
                    .params(dept, sem, code).query(Integer.class).single() == 0) {
                throw ApiException.badRequest(code + " is not a subject of this department in " + Semesters.label(sem));
            }
            db.sql("INSERT INTO faculty_subjects (user_id, dept_key, semester, subject_code) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING")
                    .params(userId, dept, sem, code).update();
        }
    }

    private FacultyAccount account(long id) {
        return db.sql("""
                        SELECT f.id, f.title, f.name, f.staff_id, f.dept_key, d.name AS dept_name, f.designation,
                               f.mobile, f.email, u.id AS user_id, u.username, coalesce(u.enabled, FALSE) AS active,
                               f.verified_by, f.verified_at
                        FROM faculty_master f JOIN departments d ON d.dept_key = f.dept_key
                        LEFT JOIN users u ON u.id = f.user_id
                        WHERE f.id = ? AND f.college_key = ?
                        """).params(id, departments.college())
                .query((rs, n) -> {
                    long userId = rs.getLong("user_id");
                    List<HandlingSubject> subs = rs.wasNull() ? List.of() : db.sql("""
                                    SELECT fs.semester, fs.subject_code, coalesce(j.title, '') FROM faculty_subjects fs
                                    LEFT JOIN subjects j ON j.dept_key = fs.dept_key AND j.semester = fs.semester
                                                        AND j.code = fs.subject_code
                                    WHERE fs.user_id = ? ORDER BY fs.semester, fs.subject_code
                                    """).param(userId)
                            .query((r, m) -> new HandlingSubject(Semesters.label(r.getInt(1)), r.getString(2), r.getString(3)))
                            .list();
                    return new FacultyAccount(rs.getLong("id"), rs.getString("title"), rs.getString("name"),
                            rs.getString("staff_id"), rs.getString("dept_key"), rs.getString("dept_name"),
                            rs.getString("designation"), rs.getString("mobile"), rs.getString("email"),
                            rs.getString("username"), rs.getBoolean("active"), rs.getString("verified_by"),
                            rs.getObject("verified_at", OffsetDateTime.class), subs);
                })
                .optional().orElseThrow(() -> ApiException.notFound("Faculty record not found"));
    }

    private static String req(String v, String field) {
        if (v == null || v.isBlank()) throw ApiException.badRequest(field + " is required");
        return v.trim();
    }

    private static LocalDate date(String v, String field) {
        try {
            return LocalDate.parse(req(v, field));
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest(field + " must be a date (yyyy-mm-dd)");
        }
    }

    private static String startingPassword() {
        StringBuilder b = new StringBuilder("Kv@");
        for (int i = 0; i < 9; i++) b.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        return b.toString();
    }

}
