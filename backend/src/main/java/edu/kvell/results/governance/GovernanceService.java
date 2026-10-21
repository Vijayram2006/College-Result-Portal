package edu.kvell.results.governance;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.governance.SystemConfig.CollegeLock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Reads and changes the Super Admin's gateway / lock configuration, and answers the questions the rest of the server
 * asks before acting: is the student portal open, are this college's results released, may faculty save marks, may
 * this college's COE change anything. Enforced here (and in GovernanceFilter), not just shown in the browser.
 */
@Service
public class GovernanceService {

    /** Deadlines are entered as India local time. */
    public static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    private final JdbcClient db;
    private final ObjectMapper json;
    private final AuditService audit;

    public GovernanceService(JdbcClient db, ObjectMapper json, AuditService audit) {
        this.db = db;
        this.json = json;
        this.audit = audit;
    }

    /** The current configuration: what was saved, on top of the defaults (so fields added later are never missing). */
    public SystemConfig current() {
        ObjectNode merged = json.valueToTree(SystemConfig.defaults());
        db.sql("SELECT config::text FROM system_config WHERE id = 1").query(String.class).optional()
                .ifPresent(saved -> merge(merged, json.readTree(saved)));
        SystemConfig config = json.treeToValue(merged, SystemConfig.class);
        // Grading is fixed by the server until the college confirms its rules; a stored copy never overrides it
        return new SystemConfig(config.systemMode(), config.lastUpdated(), config.updatedBy(),
                config.academicSession(), config.gateways(), withAllColleges(config.institutionalLocks()),
                SystemConfig.actualGrading(), markApproval(config));
    }

    /** Applies a partial change (same shape as the configuration), validates it, saves it and records it. */
    @Transactional
    public SystemConfig update(JsonNode patch, CurrentUser user, String ip) {
        if (patch == null || !patch.isObject()) throw ApiException.badRequest("A configuration object is required");
        ObjectNode merged = json.valueToTree(current());
        merge(merged, patch);
        SystemConfig requested = json.treeToValue(merged, SystemConfig.class);
        validate(requested);
        SystemConfig saved = new SystemConfig(requested.systemMode(), OffsetDateTime.now(ZONE).toString(),
                user.name() + " (" + user.username() + ")", requested.academicSession(), requested.gateways(),
                withAllColleges(requested.institutionalLocks()), SystemConfig.actualGrading(), markApproval(requested));
        db.sql("""
                        INSERT INTO system_config (id, config, updated_by, updated_at) VALUES (1, CAST(? AS jsonb), ?, now())
                        ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_by = EXCLUDED.updated_by,
                                                      updated_at = now()
                        """)
                .params(json.writeValueAsString(saved), saved.updatedBy()).update();
        audit.record(user.username(), user.name(), "UPDATED_SYSTEM_CONFIG", "Portal gateways & locks",
                describe(saved), ip);
        return saved;
    }

    @Transactional
    public SystemConfig reset(CurrentUser user, String ip) {
        db.sql("DELETE FROM system_config WHERE id = 1").update();
        audit.record(user.username(), user.name(), "RESET_SYSTEM_CONFIG", "Portal gateways & locks",
                "Restored the default gateways and locks (all portals open, nothing locked).", ip);
        return current();
    }

    // ---- Questions asked before acting ----

    /** Students may not sign in or read anything while this is true. */
    public boolean studentPortalClosed() {
        SystemConfig c = current();
        return !"OPERATIONAL".equals(c.systemMode()) || !c.gateways().studentResultPortal().enabled();
    }

    /** The college's students see no marks while this is true (they can still sign in). */
    public boolean resultsWithheld(String college) {
        SystemConfig c = current();
        return c.gateways().studentResultPortal().withholdResults() || !lock(c, college).resultsLive();
    }

    /** Why the college's COE may not change anything right now, or null when changes are allowed. */
    public String coeLockReason(String college) {
        SystemConfig c = current();
        if ("EMERGENCY_LOCK".equals(c.systemMode())) return "The university is in emergency lockdown.";
        CollegeLock lock = lock(c, college);
        if (lock.locked()) return "This college is locked by the Super Admin.";
        if (lock.freezeSubmissions()) return "Changes for this college are frozen by the Super Admin.";
        return null;
    }

    /** Why faculty may not save or forward marks right now, or null when they may. */
    public String facultyLockReason(String college) {
        SystemConfig c = current();
        SystemConfig.FacultyGateway gateway = c.gateways().facultyMarkEntry();
        if ("EMERGENCY_LOCK".equals(c.systemMode())) return "The university is in emergency lockdown.";
        if (!gateway.enabled()) {
            return blank(gateway.lockNotice()) ? "Mark entry is closed by the Controller of Examinations."
                    : gateway.lockNotice();
        }
        LocalDateTime deadline = deadline(gateway.submissionDeadline());
        if (deadline != null && LocalDateTime.now(ZONE).isAfter(deadline)) {
            return "The mark submission deadline (" + deadline.toString().replace('T', ' ') + ") has passed.";
        }
        String coe = coeLockReason(college);
        return coe == null ? null : coe.replace("This college is locked", "Mark entry for this college is locked");
    }

    /** Which approvals forwarded marks need before they may be published. */
    public SystemConfig.MarkApproval markApproval() {
        return markApproval(current());
    }

    private static SystemConfig.MarkApproval markApproval(SystemConfig c) {
        return c.markApproval() == null ? new SystemConfig.MarkApproval(false, false) : c.markApproval();
    }

    /** Whether faculty may change Part A (internal) / Part B + C (external) marks. */
    public boolean facultyMayEditPartA() {
        return current().gateways().facultyMarkEntry().allowInternalMarkEdit();
    }

    public boolean facultyMayEditPartBC() {
        return current().gateways().facultyMarkEntry().allowExternalMarkEdit();
    }

    /** Throws 423 when students may not apply for revaluation now; returns the fee per course otherwise. */
    public int requireRevaluationOpen() {
        SystemConfig c = current();
        SystemConfig.RevaluationGateway window = c.gateways().revaluationWindow();
        if (!"OPERATIONAL".equals(c.systemMode()) || !window.enabled()) {
            throw new ApiException(HttpStatus.LOCKED, "The revaluation window is closed.");
        }
        LocalDateTime deadline = deadline(window.deadline());
        if (deadline != null && LocalDateTime.now(ZONE).isAfter(deadline)) {
            throw new ApiException(HttpStatus.LOCKED, "The revaluation deadline has passed.");
        }
        return window.feePerCourse();
    }

    // ---- helpers ----

    private static CollegeLock lock(SystemConfig c, String college) {
        CollegeLock lock = c.institutionalLocks() == null ? null : c.institutionalLocks().get(college);
        return lock == null ? new CollegeLock(false, true, false) : lock;
    }

    private static Map<String, CollegeLock> withAllColleges(Map<String, CollegeLock> locks) {
        Map<String, CollegeLock> all = new java.util.LinkedHashMap<>();
        for (String college : new String[] {"engineering", "nursing", "pharmacy"}) {
            CollegeLock l = locks == null ? null : locks.get(college);
            all.put(college, l == null ? new CollegeLock(false, true, false) : l);
        }
        return all;
    }

    private static void validate(SystemConfig c) {
        if (!SystemConfig.MODES.contains(c.systemMode())) throw ApiException.badRequest("Unknown system mode");
        if (c.institutionalLocks() != null) {
            for (String college : c.institutionalLocks().keySet()) {
                if (!Departments.COLLEGES.contains(college)) throw ApiException.badRequest("Unknown college " + college);
            }
        }
        var g = c.gateways();
        if (g == null || g.studentResultPortal() == null || g.facultyMarkEntry() == null || g.revaluationWindow() == null) {
            throw ApiException.badRequest("All three gateways are required");
        }
        deadline(g.facultyMarkEntry().submissionDeadline());
        deadline(g.revaluationWindow().deadline());
        if (g.revaluationWindow().feePerCourse() < 0 || g.revaluationWindow().feePerCourse() > 100_000) {
            throw ApiException.badRequest("The revaluation fee must be between 0 and 100000");
        }
        maxLength(g.studentResultPortal().announcement(), 500, "The announcement");
        maxLength(g.facultyMarkEntry().lockNotice(), 500, "The faculty lock notice");
        if (c.academicSession() != null) {
            maxLength(c.academicSession().academicYear(), 20, "The academic year");
        }
    }

    /** Parses a deadline (yyyy-MM-ddTHH:mm[:ss]); blank means none. Throws 400 for anything else. */
    static LocalDateTime deadline(String value) {
        if (blank(value)) return null;
        try {
            return LocalDateTime.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("Deadlines must look like 2026-11-30T23:59");
        }
    }

    private static void maxLength(String value, int max, String label) {
        if (value != null && value.length() > max) throw ApiException.badRequest(label + " is too long");
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    /** Deep merge: objects are merged key by key, everything else (including arrays) is replaced. */
    private static void merge(ObjectNode target, JsonNode patch) {
        if (patch == null || !patch.isObject()) return;
        for (Map.Entry<String, JsonNode> e : patch.properties()) {
            JsonNode existing = target.get(e.getKey());
            if (existing instanceof ObjectNode obj && e.getValue().isObject()) {
                merge(obj, e.getValue());
            } else {
                target.set(e.getKey(), e.getValue());
            }
        }
    }

    private static String describe(SystemConfig c) {
        var g = c.gateways();
        StringBuilder s = new StringBuilder("Mode ").append(c.systemMode())
                .append("; student portal ").append(g.studentResultPortal().enabled() ? "open" : "closed")
                .append(g.studentResultPortal().withholdResults() ? " (results withheld)" : "")
                .append("; faculty mark entry ").append(g.facultyMarkEntry().enabled() ? "open" : "closed")
                .append("; revaluation ").append(g.revaluationWindow().enabled() ? "open" : "closed");
        c.institutionalLocks().forEach((college, l) -> {
            if (l.locked() || l.freezeSubmissions() || !l.resultsLive()) {
                s.append("; ").append(college).append(l.locked() ? " locked" : "")
                        .append(l.freezeSubmissions() ? " frozen" : "").append(l.resultsLive() ? "" : " results hidden");
            }
        });
        return s.append('.').toString();
    }
}
