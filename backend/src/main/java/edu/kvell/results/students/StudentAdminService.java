package edu.kvell.results.students;

import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import edu.kvell.results.auth.AuthService;
import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.RowErrorsException;
import edu.kvell.results.common.RowErrorsException.RowError;
import edu.kvell.results.common.Semesters;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Student Data: the class list (Register Number, Name, DOB, Category) that students sign in with. */
@Service
public class StudentAdminService {

    public record StudentRow(Integer row, String regNo, String name, String dob, String category) {
    }

    public record SaveRequest(String deptKey, String year, String semester, String academicYear,
                              List<StudentRow> students) {
    }

    /** withoutDob: saved students who have no date of birth yet, so they cannot sign in. */
    public record SaveResult(int created, int updated, int total, int withoutDob) {
    }

    /** Field names match the Student Data screen's records. */
    public record StudentView(String regNo, String studentName, String dob, String dept, String deptKey,
                              String deptName, String category, String year, String semester, String academicYear) {
    }

    private static final Pattern REG_NO = Pattern.compile("[A-Z0-9][A-Z0-9/-]{0,29}");
    private static final LocalDate EARLIEST_DOB = LocalDate.of(1950, 1, 1);
    private static final int MAX_ROWS = 5000;

    private final JdbcClient db;
    private final Departments departments;
    private final PasswordEncoder encoder;
    private final AuditService audit;

    public StudentAdminService(JdbcClient db, Departments departments, PasswordEncoder encoder, AuditService audit) {
        this.db = db;
        this.departments = departments;
        this.encoder = encoder;
        this.audit = audit;
    }

    @org.springframework.beans.factory.annotation.Autowired
    private NotificationService notifications;

    @org.springframework.beans.factory.annotation.Autowired
    private edu.kvell.results.common.ResultsCache cache;

    public List<StudentView> list(String dept, String semester) {
        return list(dept, semester, null, null);
    }

    /** Students of the college, narrowed by any of department, semester, study year and academic year. */
    public List<StudentView> list(String dept, String semester, String year, String academicYear) {
        String deptKey = dept == null || dept.isBlank() ? null : departments.key(dept);
        Integer sem = semester == null || semester.isBlank() ? null : Semesters.parse(semester);
        String yearLabel = year == null || year.isBlank() ? null : year.trim();
        String acYear = academicYear == null || academicYear.isBlank() ? null : academicYear.trim();
        return db.sql("""
                        SELECT s.reg_no, s.name, s.dob, s.dept_key, d.name AS dept_name, s.category, s.year_label,
                               s.semester, s.academic_year
                        FROM students s JOIN departments d ON d.dept_key = s.dept_key
                        WHERE (CAST(:dept AS VARCHAR) IS NULL OR s.dept_key = :dept)
                          AND (CAST(:sem AS SMALLINT) IS NULL OR s.semester = :sem)
                          AND (CAST(:year AS VARCHAR) IS NULL OR s.year_label = :year)
                          AND (CAST(:acYear AS VARCHAR) IS NULL OR s.academic_year = :acYear)
                          AND """ + departments.inCollege("s.dept_key") + """
                        ORDER BY (s.category = 'lateral'), s.reg_no
                        """)
                .param("dept", deptKey).param("sem", sem).param("year", yearLabel).param("acYear", acYear)
                .query((rs, n) -> new StudentView(rs.getString("reg_no"), rs.getString("name"),
                        dobText(rs.getObject("dob", LocalDate.class)),
                        rs.getString("dept_key").toUpperCase(Locale.ROOT), rs.getString("dept_key"),
                        rs.getString("dept_name"), rs.getString("category"), rs.getString("year_label"),
                        Semesters.label(rs.getInt("semester")), rs.getString("academic_year")))
                .list();
    }

    /** Validates every row first; saves nothing unless all rows are valid. Existing students are updated. */
    @Transactional
    public SaveResult save(SaveRequest request, CurrentUser user, String ip) {
        if (request == null || request.students() == null || request.students().isEmpty()) {
        cache.clear();
            throw ApiException.badRequest("Add at least one student");
        }
        if (request.students().size() > MAX_ROWS) {
            throw ApiException.badRequest("At most " + MAX_ROWS + " students can be saved at once");
        }
        String deptKey = departments.key(request.deptKey());
        int semester = Semesters.parse(request.semester());
        String year = required(request.year(), "Year", 20);
        String academicYear = required(request.academicYear(), "Academic year", 20);

        List<RowError> errors = new ArrayList<>();
        List<StudentRow> clean = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        LocalDate latestDob = LocalDate.now().minusYears(10);
        for (int i = 0; i < request.students().size(); i++) {
            StudentRow r = request.students().get(i);
            int rowNo = r.row() != null ? r.row() : i + 2; // spreadsheet row: header is row 1
            String reg = r.regNo() == null ? "" : r.regNo().trim().toUpperCase(Locale.ROOT);
            String name = r.name() == null ? "" : r.name().trim().replaceAll("\\s+", " ");
            int before = errors.size();

            if (!REG_NO.matcher(reg).matches()) {
                errors.add(new RowError(rowNo, reg, "Register Number",
                        reg.isEmpty() ? "Register Number is missing" : "Use only letters, digits, / or - (max 30)"));
            } else if (!seen.add(reg)) {
                errors.add(new RowError(rowNo, reg, "Register Number", "Duplicate Register Number in this sheet"));
            }
            if (name.isEmpty() || name.length() > 120) {
                errors.add(new RowError(rowNo, reg, "Name", name.isEmpty() ? "Name is missing" : "Name is too long"));
            }
            // DOB is optional (it can be uploaded later), but if given it must be a real date
            boolean dobGiven = r.dob() != null && !r.dob().isBlank();
            LocalDate dob = dobGiven ? AuthService.parseDob(r.dob()) : null;
            if (dobGiven && dob == null) {
                errors.add(new RowError(rowNo, reg, "DOB",
                        "DOB must be a date like 2007-03-14 or 14/03/2007 (got \"" + nullToEmpty(r.dob()) + "\")"));
            } else if (dob != null && (dob.isBefore(EARLIEST_DOB) || dob.isAfter(latestDob))) {
                errors.add(new RowError(rowNo, reg, "DOB", "DOB " + dob + " is not a plausible student birth date"));
            }
            String category = r.category() == null || r.category().isBlank() ? "regular"
                    : r.category().trim().toLowerCase(Locale.ROOT);
            if (category.contains("lateral")) category = "lateral";
            if (!category.equals("regular") && !category.equals("lateral")) {
                errors.add(new RowError(rowNo, reg, "Category", "Category must be Regular or Lateral"));
            }
            if (errors.size() == before) {
                clean.add(new StudentRow(rowNo, reg, name, dob == null ? null : dob.toString(), category));
            }
        }
        if (!clean.isEmpty()) {
            List<String> staff = db.sql("SELECT username FROM users WHERE role <> 'STUDENT' AND username IN (:regs)")
                    .param("regs", clean.stream().map(StudentRow::regNo).toList())
                    .query(String.class).list();
            // A Register Number already enrolled in another college must not be moved (or its DOB reset) from here
            List<String> otherCollege = db.sql("""
                            SELECT s.reg_no FROM students s JOIN departments d ON d.dept_key = s.dept_key
                            WHERE s.reg_no IN (:regs) AND d.college_key <> :college
                            """)
                    .param("regs", clean.stream().map(StudentRow::regNo).toList())
                    .param("college", departments.college())
                    .query(String.class).list();
            for (StudentRow r : clean) {
                if (staff.contains(r.regNo())) {
                    errors.add(new RowError(r.row(), r.regNo(), "Register Number",
                            "This Register Number is already used by a staff login"));
                } else if (otherCollege.contains(r.regNo())) {
                    errors.add(new RowError(r.row(), r.regNo(), "Register Number",
                            "This Register Number belongs to a student of another college"));
                }
            }
        }
        if (!errors.isEmpty()) throw new RowErrorsException(errors);

        // Students never sign in with a password, so their hash is random and never matches.
        String unusableHash = encoder.encode(UUID.randomUUID().toString());
        int created = 0;
        for (StudentRow r : clean) {
            boolean exists = db.sql("SELECT count(*) FROM students WHERE reg_no = ?").param(r.regNo())
                    .query(Integer.class).single() > 0;
            if (exists) {
                db.sql("""
                                UPDATE students SET name = ?, dob = COALESCE(CAST(? AS DATE), dob), dept_key = ?,
                                       category = ?, year_label = ?,
                                       semester = ?, academic_year = ?, updated_at = now()
                                WHERE reg_no = ?
                                """)
                        .params(r.name(), r.dob(), deptKey, r.category(), year, semester, academicYear, r.regNo())
                        .update();
                db.sql("UPDATE users SET display_name = ?, dept_key = ? WHERE username = ? AND role = 'STUDENT'")
                        .params(r.name(), deptKey, r.regNo()).update();
            } else {
                db.sql("""
                                INSERT INTO students (reg_no, name, dob, dept_key, category, year_label, semester,
                                                      academic_year)
                                VALUES (?, ?, CAST(? AS DATE), ?, ?, ?, ?, ?)
                                """)
                        .params(r.regNo(), r.name(), r.dob(), deptKey, r.category(), year, semester,
                                academicYear)
                        .update();
                db.sql("""
                                INSERT INTO users (username, password_hash, role, display_name, dept_key, reg_no)
                                VALUES (?, ?, 'STUDENT', ?, ?, ?)
                                """)
                        .params(r.regNo(), unusableHash, r.name(), deptKey, r.regNo()).update();
                created++;
            }
        }
        int updated = clean.size() - created;
        int withoutDob = db.sql("SELECT count(*) FROM students WHERE dob IS NULL AND reg_no IN (:regs)")
                .param("regs", clean.stream().map(StudentRow::regNo).toList()).query(Integer.class).single();
        audit.record(user.username(), user.name(), "UPLOADED_STUDENT_DATA",
                deptKey.toUpperCase(Locale.ROOT) + " " + year + " - " + Semesters.label(semester),
                "Saved student data: " + created + " new, " + updated + " updated.", ip);
        if (created > 0) {
            String what = created + " new student" + (created == 1 ? "" : "s") + " added to "
                    + deptKey.toUpperCase(Locale.ROOT) + " " + Semesters.label(semester);
            notifications.notify(Audience.FACULTY, deptKey, semester, "New students added", what
                    + ". They are now in Mark Entry.", null);
            notifications.notify(Audience.HOD, deptKey, semester, "New students added", what + ".", null);
        }
        return new SaveResult(created, updated, clean.size(), withoutDob);
    }

    @Transactional
    public void delete(String regNo, CurrentUser user, String ip) {
        cache.clear();
        String reg = regNo.trim().toUpperCase(Locale.ROOT);
        int deleted = db.sql("DELETE FROM students WHERE reg_no = ? AND " + departments.inCollege("dept_key"))
                .param(reg).update();
        if (deleted == 0) throw ApiException.notFound("Student not found");
        audit.record(user.username(), user.name(), "DELETED_STUDENT", reg,
                "Deleted a student with their marks and results.", ip);
    }

    /**
     * "Delete Target Year Data": every student of one department, year and semester (and academic year, when given),
     * with their marks.
     */
    @Transactional
    public int deleteGroup(String dept, String year, String semester, String academicYear, CurrentUser user,
                           String ip) {
        cache.clear();
        String deptKey = departments.key(dept);
        int sem = Semesters.parse(semester);
        String yearLabel = required(year, "Year", 20);
        String acYear = academicYear == null || academicYear.isBlank() ? null : academicYear.trim();
        int deleted = db.sql("""
                        DELETE FROM students WHERE dept_key = ? AND year_label = ? AND semester = ?
                          AND (CAST(? AS VARCHAR) IS NULL OR academic_year = ?)
                        """)
                .params(deptKey, yearLabel, sem, acYear, acYear).update();
        audit.record(user.username(), user.name(), "DELETED_TARGET_YEAR_DATA",
                deptKey.toUpperCase(Locale.ROOT) + " - " + yearLabel + " (" + Semesters.label(sem) + ")"
                        + (acYear == null ? "" : " " + acYear),
                "Deleted " + deleted + " students with their marks and results.", ip);
        return deleted;
    }

    private static String required(String value, String field, int max) {
        if (value == null || value.isBlank()) throw ApiException.badRequest(field + " is required");
        String v = value.trim();
        if (v.length() > max) throw ApiException.badRequest(field + " is too long");
        return v;
    }

    private static String dobText(LocalDate dob) {
        return dob == null ? "" : dob.toString();
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
