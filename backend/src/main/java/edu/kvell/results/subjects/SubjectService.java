package edu.kvell.results.subjects;

import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The subject catalog the admin builds; Mark Entry offers these subjects per department. */
@Service
public class SubjectService {

    /** Matches the admin panel's SubjectItem. */
    public record SubjectItem(String id, String code, String title, String category, Integer credits,
                              String department, String deptKey, String semester, String academicYear,
                              String faculty, String status, Integer studentsEnrolled) {
    }

    private static final Pattern CODE = Pattern.compile("[A-Z0-9][A-Z0-9-]{0,19}");
    private static final Set<String> CATEGORIES = Set.of("Core Mandatory", "Professional Elective", "Open Elective");
    private static final Set<String> STATUSES = Set.of("COE FINALIZED", "PENDING APPROVAL");

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;

    public SubjectService(JdbcClient db, Departments departments, AuditService audit) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
    }

    @org.springframework.beans.factory.annotation.Autowired
    private NotificationService notifications;

    public List<SubjectItem> list(String dept) {
        String deptKey = dept == null || dept.isBlank() ? null : departments.key(dept);
        return db.sql("""
                        SELECT j.id, j.code, j.title, j.category, j.credits, d.name AS dept_name, j.dept_key,
                               j.semester, j.academic_year, j.faculty, j.status,
                               (SELECT count(*) FROM students s
                                WHERE s.dept_key = j.dept_key AND s.semester = j.semester) AS enrolled
                        FROM subjects j JOIN departments d ON d.dept_key = j.dept_key
                        WHERE (CAST(:dept AS VARCHAR) IS NULL OR j.dept_key = :dept)
                          AND """ + departments.inCollege("j.dept_key") + """
                        ORDER BY j.created_at DESC, j.id DESC
                        """)
                .param("dept", deptKey)
                .query((rs, n) -> new SubjectItem(String.valueOf(rs.getLong("id")), rs.getString("code"),
                        rs.getString("title"), rs.getString("category"), rs.getInt("credits"),
                        rs.getString("dept_name"), rs.getString("dept_key"), Semesters.label(rs.getInt("semester")),
                        rs.getString("academic_year"), rs.getString("faculty"), rs.getString("status"),
                        rs.getInt("enrolled")))
                .list();
    }

    @Transactional
    public SubjectItem create(SubjectItem in, CurrentUser user, String ip) {
        String code = in.code() == null ? "" : in.code().trim().toUpperCase(Locale.ROOT);
        if (!CODE.matcher(code).matches()) throw ApiException.badRequest("Subject code must be letters/digits, max 20");
        String title = in.title() == null ? "" : in.title().trim();
        if (title.isEmpty() || title.length() > 160) throw ApiException.badRequest("Subject title is required");
        String category = in.category() == null ? "Core Mandatory" : in.category().trim();
        if (!CATEGORIES.contains(category)) throw ApiException.badRequest("Unknown subject category");
        int credits = in.credits() == null ? 4 : in.credits();
        if (credits < 0 || credits > 20) throw ApiException.badRequest("Credits must be between 0 and 20");
        String deptKey = departments.key(in.department() != null ? in.department() : in.deptKey());
        int semester = Semesters.parse(in.semester() == null ? "Semester I" : in.semester());
        String academicYear = in.academicYear() == null || in.academicYear().isBlank() ? "2026-27"
                : in.academicYear().trim();
        String faculty = in.faculty() == null || in.faculty().isBlank() ? "Faculty In-Charge" : in.faculty().trim();
        String status = in.status() == null ? "COE FINALIZED" : in.status().trim();
        if (!STATUSES.contains(status)) throw ApiException.badRequest("Unknown subject status");

        boolean exists = db.sql("SELECT count(*) FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?")
                .params(deptKey, semester, code).query(Integer.class).single() > 0;
        if (exists) throw ApiException.conflict(code + " already exists for this department and semester");

        long id = db.sql("""
                        INSERT INTO subjects (code, title, category, credits, dept_key, semester, academic_year,
                                              faculty, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                        """)
                .params(code, title, category, credits, deptKey, semester, academicYear, truncate(faculty, 120),
                        status)
                .query(Long.class).single();
        audit.record(user.username(), user.name(), "CREATED_SUBJECT", code + " - " + title,
                "Added subject to " + deptKey.toUpperCase(Locale.ROOT) + " " + Semesters.label(semester) + ".", ip);
        notifications.notify(Audience.FACULTY, deptKey, semester, "New subject: " + code,
                code + " " + title + " was added to " + Semesters.label(semester) + ". You can enter its marks now.",
                null);
        return get(id);
    }

    @Transactional
    public SubjectItem setStatus(long id, String status, CurrentUser user, String ip) {
        if (status == null || !STATUSES.contains(status.trim())) throw ApiException.badRequest("Unknown subject status");
        SubjectItem subject = get(id);
        db.sql("UPDATE subjects SET status = ? WHERE id = ?").params(status.trim(), id).update();
        audit.record(user.username(), user.name(), "UPDATED_SUBJECT_STATUS", subject.code(),
                "Set subject status to " + status.trim() + ".", ip);
        return get(id);
    }

    @Transactional
    public int finalizeAll(CurrentUser user, String ip) {
        int updated = db.sql("UPDATE subjects SET status = 'COE FINALIZED' WHERE status <> 'COE FINALIZED' AND "
                + departments.inCollege("dept_key")).update();
        audit.record(user.username(), user.name(), "FINALIZED_SUBJECTS", "Subject catalog",
                "COE finalized " + updated + " subjects.", ip);
        return updated;
    }

    @Transactional
    public void delete(long id, CurrentUser user, String ip) {
        SubjectItem subject = get(id);
        db.sql("DELETE FROM subjects WHERE id = ?").param(id).update();
        audit.record(user.username(), user.name(), "DELETED_SUBJECT", subject.code() + " - " + subject.title(),
                "Removed subject from the catalog (published results are kept).", ip);
    }

    @Transactional
    public int deleteAll(CurrentUser user, String ip) {
        int deleted = db.sql("DELETE FROM subjects WHERE " + departments.inCollege("dept_key")).update();
        audit.record(user.username(), user.name(), "CLEARED_SUBJECTS", "Subject catalog",
                "Removed all " + deleted + " subjects (published results are kept).", ip);
        return deleted;
    }

    /** Credits used for SGPA when a subject's marks are committed; 0 if the subject was removed. */
    public int credits(String deptKey, int semester, String code) {
        return db.sql("SELECT credits FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?")
                .params(deptKey, semester, code).query(Integer.class).optional().orElse(0);
    }

    private SubjectItem get(long id) {
        return list(null).stream().filter(s -> s.id().equals(String.valueOf(id))).findFirst()
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
