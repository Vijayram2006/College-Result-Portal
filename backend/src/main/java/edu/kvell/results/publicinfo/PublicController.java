package edu.kvell.results.publicinfo;

import edu.kvell.results.common.Semesters;
import edu.kvell.results.governance.GovernanceService;
import edu.kvell.results.governance.SystemConfig;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Aggregate figures for the public login page and portal banners (no names, marks or register numbers):
 * when results were last published and the overall pass rate of published results.
 */
@RestController
@RequestMapping("/api/public")
public class PublicController {

    public record Summary(String lastPublishedAt, String lastPublishedLabel, double passPercentage,
                          int studentsWithResults) {
    }

    private final JdbcClient db;
    private final GovernanceService governance;

    public PublicController(JdbcClient db, GovernanceService governance) {
        this.db = db;
        this.governance = governance;
    }

    /**
     * The Super Admin's gateways and locks (portal open/closed, announcement, deadlines, revaluation window). Read by
     * both portals, before sign-in too; the server enforces them independently.
     */
    @GetMapping("/system-config")
    SystemConfig systemConfig() {
        return governance.current();
    }

    @GetMapping("/summary")
    Summary summary() {
        OffsetDateTime last = db.sql("SELECT max(published_at) FROM result_batches WHERE status = 'PUBLISHED'")
                .query(OffsetDateTime.class).optional().orElse(null);
        Map<String, Object> pass = db.sql("""
                        SELECT count(*) AS total, count(*) FILTER (WHERE NOT failed) AS passed FROM (
                            SELECT r.reg_no, bool_or(NOT r.passed) AS failed
                            FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                            WHERE b.status = 'PUBLISHED' GROUP BY r.reg_no) x
                        """)
                .query().singleRow();
        int total = ((Number) pass.get("total")).intValue();
        int passed = ((Number) pass.get("passed")).intValue();
        double percent = total == 0 ? 0
                : BigDecimal.valueOf(passed * 100.0 / total).setScale(1, RoundingMode.HALF_UP).doubleValue();
        String label = last == null ? null
                : last.atZoneSameInstant(java.time.ZoneId.of("Asia/Kolkata"))
                        .format(java.time.format.DateTimeFormatter.ofPattern("MMM yyyy", java.util.Locale.ENGLISH));
        return new Summary(Semesters.display(last), label, percent, total);
    }
}
