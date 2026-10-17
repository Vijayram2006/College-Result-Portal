package edu.kvell.results.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The retention policy (docs/RETENTION-POLICY.md), run daily at 02:30 IST: expired sign-in sessions are removed,
 * notifications older than app.retention.notification-days, and audit entries older than app.retention.audit-years.
 * Results, marks and students are never purged here; old semesters are archived by export (see the policy).
 */
@Component
public class RetentionJob {

    private static final Logger log = LoggerFactory.getLogger(RetentionJob.class);

    private final JdbcClient db;
    private final int auditYears;
    private final int notificationDays;

    public RetentionJob(JdbcClient db, @Value("${app.retention.audit-years:7}") int auditYears,
                        @Value("${app.retention.notification-days:365}") int notificationDays) {
        this.db = db;
        this.auditYears = auditYears;
        this.notificationDays = notificationDays;
    }

    @Scheduled(cron = "0 30 2 * * *", zone = "Asia/Kolkata")
    @Transactional
    public void run() {
        int tokens = db.sql("DELETE FROM auth_tokens WHERE expires_at < now()").update();
        int notes = db.sql("DELETE FROM notifications WHERE created_at < now() - make_interval(days => ?)")
                .param(notificationDays).update();
        // The audit log is append-only; only this job may purge, and only entries past the retention period
        db.sql("SELECT set_config('app.audit_purge', 'on', true)").query(String.class).single();
        int audit = db.sql("DELETE FROM audit_logs WHERE created_at < now() - make_interval(years => ?)")
                .param(auditYears).update();
        log.info("Retention: removed {} expired sessions, {} old notifications, {} audit entries older than {} years",
                tokens, notes, audit, auditYears);
    }
}
