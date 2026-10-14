package edu.kvell.results.notifications;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.Semesters;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Notifications for the bell icons. Events (forwarding, publishing, new students or subjects) call {@link #notify};
 * each signed-in user sees the ones addressed to their role, college and department.
 */
@Service
public class NotificationService {

    public enum Audience { COE, HOD, FACULTY, STUDENT }

    public record Item(long id, String title, String message, String link, String createdAt, boolean read) {
    }

    public record Inbox(int unread, List<Item> items) {
    }

    private final JdbcClient db;

    public NotificationService(JdbcClient db) {
        this.db = db;
    }

    /** Sends a notification to an audience of one department (deptKey) or, for the COE, of the department's college. */
    public void notify(Audience audience, String deptKey, Integer semester, String title, String message, String link) {
        db.sql("""
                        INSERT INTO notifications (college_key, audience, dept_key, semester, title, message, link)
                        SELECT d.college_key, ?, ?, ?, ?, ?, ? FROM departments d WHERE d.dept_key = ?
                        """)
                .params(audience.name(), audience == Audience.COE ? null : deptKey, semester, title, message, link,
                        deptKey)
                .update();
    }

    public Inbox inbox(CurrentUser user, int limit) {
        String where = target(user);
        List<Item> items = db.sql("""
                        SELECT n.id, n.title, n.message, n.link, n.created_at,
                               EXISTS (SELECT 1 FROM notification_reads r
                                       WHERE r.notification_id = n.id AND r.user_id = :uid) AS is_read
                        FROM notifications n
                        WHERE """ + where + """
                        ORDER BY n.created_at DESC, n.id DESC LIMIT :limit
                        """)
                .params(params(user, limit))
                .query((rs, n) -> new Item(rs.getLong("id"), rs.getString("title"), rs.getString("message"),
                        rs.getString("link"), Semesters.display(rs.getObject("created_at", OffsetDateTime.class)),
                        rs.getBoolean("is_read")))
                .list();
        int unread = db.sql("""
                        SELECT count(*) FROM notifications n
                        WHERE """ + where + """
                          AND NOT EXISTS (SELECT 1 FROM notification_reads r
                                          WHERE r.notification_id = n.id AND r.user_id = :uid)
                        """)
                .params(params(user, limit))
                .query(Integer.class).single();
        return new Inbox(unread, items);
    }

    /** Marks one notification read (only if it is addressed to this user). */
    public void markRead(CurrentUser user, long id) {
        db.sql("""
                        INSERT INTO notification_reads (notification_id, user_id)
                        SELECT n.id, :uid FROM notifications n WHERE n.id = :id AND """ + target(user) + """
                        ON CONFLICT DO NOTHING
                        """)
                .params(params(user, 0)).param("id", id)
                .update();
    }

    public void markAllRead(CurrentUser user) {
        db.sql("""
                        INSERT INTO notification_reads (notification_id, user_id)
                        SELECT n.id, :uid FROM notifications n WHERE """ + target(user) + """
                        ON CONFLICT DO NOTHING
                        """)
                .params(params(user, 0))
                .update();
    }

    /** Which notifications a user may see: by role, college and department (students also by semester). */
    private static String target(CurrentUser user) {
        return switch (user.role()) {
            case ADMIN -> " n.audience = 'COE' AND n.college_key = :college ";
            case HOD -> " n.audience = 'HOD' AND n.dept_key = :dept ";
            case FACULTY -> " n.audience = 'FACULTY' AND n.dept_key = :dept ";
            case STUDENT -> """
                     n.audience = 'STUDENT' AND n.dept_key = :dept
                      AND (n.semester IS NULL
                           OR n.semester = (SELECT s.semester FROM students s WHERE s.reg_no = :reg))
                    """;
        };
    }

    private static java.util.Map<String, Object> params(CurrentUser user, int limit) {
        java.util.Map<String, Object> p = new java.util.HashMap<>();
        p.put("uid", user.id());
        p.put("college", user.collegeKey() == null ? "" : user.collegeKey());
        p.put("dept", user.deptKey() == null ? "" : user.deptKey());
        p.put("reg", user.regNo() == null ? "" : user.regNo());
        p.put("limit", limit);
        return p;
    }
}
