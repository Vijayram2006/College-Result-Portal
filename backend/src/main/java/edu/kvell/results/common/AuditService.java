package edu.kvell.results.common;

import java.time.OffsetDateTime;
import java.util.List;
import edu.kvell.results.auth.CurrentUser;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    /** Matches the admin panel's AuditLogRecord. */
    public record AuditLogRecord(String id, String adminId, String adminName, String action, String target,
                                 String timestamp, String ipAddress, String description) {
    }

    private final JdbcClient db;

    public AuditService(JdbcClient db) {
        this.db = db;
    }

    public void record(String actor, String actorName, String action, String target, String description, String ip) {
        db.sql("""
                        INSERT INTO audit_logs (actor, actor_name, action, target, description, ip_address,
                                                college_key)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """)
                .params(actor, actorName, action, truncate(target, 200), description, ip, college(actor))
                .update();
    }

    public List<AuditLogRecord> latest(int limit) {
        return db.sql("""
                        SELECT id, actor, actor_name, action, target, description, ip_address, created_at
                        FROM audit_logs WHERE college_key = ? ORDER BY created_at DESC, id DESC LIMIT ?
                        """)
                .params(CurrentUser.get().collegeKey(), limit)
                .query((rs, n) -> new AuditLogRecord("LOG-" + rs.getLong("id"), rs.getString("actor"),
                        rs.getString("actor_name"), rs.getString("action"), rs.getString("target"),
                        Semesters.display(rs.getObject("created_at", OffsetDateTime.class)),
                        rs.getString("ip_address"), rs.getString("description")))
                .list();
    }

    /**
     * The college an action belongs to: the actor account's own. The session's college is used only when the session
     * is the actor's: a login request may still carry another account's old token.
     */
    private String college(String actor) {
        String college = CurrentUser.collegeOrNull();
        if (college != null && actor.equals(CurrentUser.get().username())) return college;
        return db.sql("""
                        SELECT coalesce(u.college_key, d.college_key, 'engineering') FROM users u
                        LEFT JOIN departments d ON d.dept_key = u.dept_key WHERE u.username = ?
                        """)
                .param(actor).query(String.class).optional().orElse("engineering");
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
