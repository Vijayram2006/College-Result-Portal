package edu.kvell.results.erp;

import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily reminders, at 6:30 pm (Monday to Saturday):
 * <ul>
 *   <li>Logbook: a faculty member with a subject that has no entry for logbook.missed_days working days is reminded;
 *       two working days later their HOD and the class in-charges are alerted too.</li>
 *   <li>Behind plan (Mondays): subjects with planned topics not yet covered; the faculty, the HOD and the class
 *       in-charges are told.</li>
 *   <li>Fees: students with overdue fees (and their parents, by WhatsApp) are reminded once a week.</li>
 * </ul>
 * Each reminder is recorded in erp_reminders so it is sent once.
 */
@Component
public class ErpReminderJob {

    private static final Logger log = LoggerFactory.getLogger(ErpReminderJob.class);

    private final JdbcClient db;
    private final ErpSupport erp;
    private final NotificationService notifications;

    public ErpReminderJob(JdbcClient db, ErpSupport erp, NotificationService notifications) {
        this.db = db;
        this.erp = erp;
        this.notifications = notifications;
    }

    @Scheduled(cron = "0 30 18 * * MON-SAT", zone = "Asia/Kolkata")
    public void run() {
        try {
            logbook(ErpSupport.today());
            fees(ErpSupport.today());
        } catch (RuntimeException e) {
            log.warn("ERP reminders failed: {}", e.getMessage());
        }
    }

    void logbook(LocalDate today) {
        int missed = erp.intSetting("logbook.missed_days", 2);
        LocalDate remindBefore = workingDaysBefore(today, missed);
        LocalDate alertBefore = workingDaysBefore(today, missed + 2);
        List<Map<String, Object>> rows = db.sql("""
                        SELECT f.user_id, u.display_name, f.dept_key, f.semester, f.subject_code,
                               (SELECT max(e.entry_date) FROM logbook_entries e WHERE e.faculty_id = f.user_id
                                  AND e.dept_key = f.dept_key AND e.semester = f.semester AND e.subject_code = f.subject_code) AS last
                        FROM faculty_subjects f JOIN users u ON u.id = f.user_id AND u.enabled
                        WHERE EXISTS (SELECT 1 FROM syllabus_units su WHERE su.dept_key = f.dept_key AND su.semester = f.semester
                                      AND su.subject_code = f.subject_code)
                        """).query().listOfRows();
        for (Map<String, Object> r : rows) {
            LocalDate last = r.get("last") == null ? null : ((java.sql.Date) r.get("last")).toLocalDate();
            if (last != null && !last.isBefore(remindBefore)) continue;
            long uid = ((Number) r.get("user_id")).longValue();
            String dept = (String) r.get("dept_key");
            int sem = ((Number) r.get("semester")).intValue();
            String code = (String) r.get("subject_code");
            String since = last == null ? "no entry yet" : "last entry " + last;
            if (once("logbook_missed", uid + "|" + code, today)) {
                notifications.notifyUser(uid, Audience.FACULTY, dept, null, "Logbook entry missing: " + code,
                        "Please fill the logbook for " + code + " (" + since + ").", "logbook");
            }
            if ((last == null || last.isBefore(alertBefore)) && once("logbook_alert", uid + "|" + code, today)) {
                String msg = r.get("display_name") + " has not filled the logbook of " + code + " (" + since + ").";
                notifications.notify(Audience.HOD, dept, sem, "Logbook not filled: " + code, msg, "logbook");
                incharges(dept, sem).forEach(id -> notifications.notifyUser(id, Audience.FACULTY,
                        db.sql("SELECT dept_key FROM users WHERE id = ?").param(id).query(String.class).single(), null,
                        "Logbook not filled: " + code, msg, "my-class"));
            }
        }
        if (today.getDayOfWeek() != DayOfWeek.MONDAY) return;
        List<Map<String, Object>> behind = db.sql("""
                        SELECT su.dept_key, su.semester, su.subject_code, count(*) AS behind
                        FROM syllabus_units su JOIN syllabus_topics t ON t.unit_id = su.id
                        WHERE t.planned_date < current_date AND NOT EXISTS (SELECT 1 FROM logbook_entries e WHERE e.topic_id = t.id)
                        GROUP BY su.dept_key, su.semester, su.subject_code
                        """).query().listOfRows();
        for (Map<String, Object> b : behind) {
            String dept = (String) b.get("dept_key");
            int sem = ((Number) b.get("semester")).intValue();
            String code = (String) b.get("subject_code");
            if (!once("behind_plan", dept + "|" + sem + "|" + code, today)) continue;
            String msg = code + " is behind plan: " + b.get("behind") + " planned topics are not covered yet.";
            db.sql("SELECT user_id FROM faculty_subjects WHERE dept_key = ? AND semester = ? AND subject_code = ?")
                    .params(dept, sem, code).query(Long.class).list()
                    .forEach(id -> notifications.notifyUser(id, Audience.FACULTY, dept, null, "Behind plan: " + code, msg, "logbook"));
            notifications.notify(Audience.HOD, dept, sem, "Behind plan: " + code, msg, "logbook");
            incharges(dept, sem).forEach(id -> notifications.notifyUser(id, Audience.FACULTY,
                    db.sql("SELECT dept_key FROM users WHERE id = ?").param(id).query(String.class).single(), null,
                    "Behind plan: " + code, msg, "my-class"));
        }
    }

    void fees(LocalDate today) {
        List<Map<String, Object>> rows = db.sql("""
                        SELECT s.reg_no, s.name, s.dept_key, s.parent_phone, u.id AS user_id,
                               sum(d.amount - d.concession - d.paid) AS overdue
                        FROM fee_demands d JOIN students s ON s.reg_no = d.reg_no
                        LEFT JOIN users u ON u.reg_no = s.reg_no AND u.role = 'STUDENT'
                        WHERE d.due_date < current_date AND d.amount - d.concession - d.paid > 0
                        GROUP BY s.reg_no, s.name, s.dept_key, s.parent_phone, u.id
                        """).query().listOfRows();
        for (Map<String, Object> r : rows) {
            String reg = (String) r.get("reg_no");
            int recent = db.sql("SELECT count(*) FROM erp_reminders WHERE kind = 'fee_overdue' AND ref = ? AND sent_on > ?")
                    .params(reg, today.minusDays(7)).query(Integer.class).single();
            if (recent > 0 || !once("fee_overdue", reg, today)) continue;
            BigDecimal overdue = (BigDecimal) r.get("overdue");
            String msg = "Fees of ₹" + overdue + " are overdue. The hall ticket and bus pass stay blocked until they are paid.";
            if (r.get("user_id") != null) {
                notifications.notifyUser(((Number) r.get("user_id")).longValue(), Audience.STUDENT, (String) r.get("dept_key"), null,
                        "Fees overdue", msg, "fees");
            }
            if (r.get("parent_phone") != null) {
                db.sql("INSERT INTO message_outbox (channel, to_phone, body, ref) VALUES ('WHATSAPP', ?, ?, ?)")
                        .params(r.get("parent_phone"), "KVELL: fees of ₹" + overdue + " for " + r.get("name") + " (" + reg
                                + ") are overdue. Please pay in the student portal.", reg).update();
            }
        }
    }

    /** Records a reminder; false when it was already sent today. */
    private boolean once(String kind, String ref, LocalDate day) {
        return db.sql("INSERT INTO erp_reminders (kind, ref, sent_on) VALUES (?, ?, ?) ON CONFLICT DO NOTHING")
                .params(kind, ref, day).update() > 0;
    }

    private List<Long> incharges(String dept, int sem) {
        return db.sql("SELECT DISTINCT section FROM students WHERE dept_key = ? AND semester = ?").params(dept, sem)
                .query(String.class).list().stream()
                .map(section -> erp.currentIncharge(dept, sem, section).orElse(null))
                .filter(java.util.Objects::nonNull).distinct().toList();
    }

    private static LocalDate workingDaysBefore(LocalDate from, int days) {
        LocalDate d = from;
        int n = 0;
        while (n < days) {
            d = d.minusDays(1);
            if (d.getDayOfWeek() != DayOfWeek.SUNDAY) n++;
        }
        return d;
    }
}
