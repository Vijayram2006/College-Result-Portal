package edu.kvell.results.publicinfo;

import java.lang.management.ManagementFactory;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liveness and readiness for hosting platforms and monitors. "/" and "/healthz" answer without touching the
 * database (Render's health check); "/readyz" also checks the database, the connection pool and memory, and answers
 * 503 when something is wrong, so an uptime monitor can alert on it.
 */
@RestController
public class HealthController {

    private static final Logger clientLog = LoggerFactory.getLogger("client-errors");

    private final JdbcClient db;
    private final DataSource dataSource;

    public HealthController(JdbcClient db, DataSource dataSource) {
        this.db = db;
        this.dataSource = dataSource;
    }

    @GetMapping({"/", "/healthz"})
    Map<String, String> health() {
        return Map.of("status", "ok", "service", "kvell-result-portal-backend");
    }

    @GetMapping({"/readyz", "/api/public/health"})
    ResponseEntity<Map<String, Object>> ready() {
        Map<String, Object> out = new LinkedHashMap<>();
        boolean ok = true;
        long start = System.nanoTime();
        try {
            db.sql("SELECT 1").query(Integer.class).single();
            out.put("database", "ok");
        } catch (RuntimeException e) {
            out.put("database", "down");
            ok = false;
        }
        out.put("databaseMs", (System.nanoTime() - start) / 1_000_000);
        if (dataSource instanceof com.zaxxer.hikari.HikariDataSource hikari && hikari.getHikariPoolMXBean() != null) {
            var pool = hikari.getHikariPoolMXBean();
            out.put("poolActive", pool.getActiveConnections());
            out.put("poolMax", hikari.getMaximumPoolSize());
            out.put("poolWaiting", pool.getThreadsAwaitingConnection());
            if (pool.getThreadsAwaitingConnection() > 5) ok = false;
        }
        Runtime rt = Runtime.getRuntime();
        long used = rt.totalMemory() - rt.freeMemory();
        int memoryPercent = (int) (used * 100 / rt.maxMemory());
        out.put("memoryPercent", memoryPercent);
        if (memoryPercent > 92) ok = false;
        out.put("uptimeSeconds", ManagementFactory.getRuntimeMXBean().getUptime() / 1000);
        out.put("status", ok ? "ok" : "degraded");
        return ResponseEntity.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(out);
    }

    /** A browser error from either portal (error boundary or window.onerror), written to the server log. */
    public record ClientError(String app, String message, String url, String stack) {
    }

    @PostMapping("/api/public/client-errors")
    ResponseEntity<Void> clientError(@RequestBody ClientError e) {
        if (e != null) {
            clientLog.warn("app={} url={} message={} stack={}", clip(e.app(), 20), clip(e.url(), 200),
                    clip(e.message(), 500), clip(e.stack(), 1500));
        }
        return ResponseEntity.noContent().build();
    }

    private static String clip(String s, int max) {
        if (s == null) return "";
        String t = s.replaceAll("[\\r\\n\\t]+", " ");
        return t.length() <= max ? t : t.substring(0, max);
    }
}
