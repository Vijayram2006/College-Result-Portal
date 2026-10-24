package edu.kvell.results.workflow;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Shared documents of the examination workflow screens: the exam timetable and the Dean's notifications, the
 * paper-correction allotments and the evaluators' work, and the three-tier revaluation records. Each is one JSON
 * document per college, read by the college's staff and written only by the roles that own it, so every user of the
 * college sees the same data (instead of a copy in one browser).
 */
@RestController
@RequestMapping("/api/workflow-docs")
public class WorkflowDocumentController {

    /** Who may write each document (every staff member of the college may read them). */
    static final Map<String, Set<Role>> WRITERS = Map.of(
            "kvell_exam_timetable", Set.of(Role.DEAN, Role.ADMIN),
            "kvell_exam_notifications", Set.of(Role.DEAN, Role.ADMIN),
            "kvell_classroom_allocations", Set.of(Role.ADMIN), // REQ-06: the COE only; the Associate Dean reads it
            "kvell_paper_correction_assignments", Set.of(Role.DEAN, Role.ADMIN, Role.FACULTY, Role.HOD),
            "kvell_faculty_evaluated_scripts", Set.of(Role.DEAN, Role.ADMIN, Role.FACULTY, Role.HOD),
            "kvell_revaluation_3tier_records_v3", Set.of(Role.DEAN, Role.ADMIN));
    static final Set<Role> READERS = Set.of(Role.DEAN, Role.ADMIN, Role.HOD, Role.FACULTY);
    static final int MAX_CHARS = 2_000_000;

    public record Doc(String key, JsonNode data, int version, String updatedBy, OffsetDateTime updatedAt) {
    }

    public record SaveRequest(JsonNode data) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final ObjectMapper json;

    public WorkflowDocumentController(JdbcClient db, Departments departments, AuditService audit, ObjectMapper json) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
        this.json = json;
    }

    @GetMapping
    List<Doc> list() {
        CurrentUser user = CurrentUser.get();
        if (!READERS.contains(user.role())) throw new ApiException(HttpStatus.FORBIDDEN, "Not available to this account");
        return db.sql("""
                        SELECT doc_key, data, version, updated_by, updated_at FROM workflow_documents
                        WHERE college_key = ? ORDER BY doc_key
                        """).param(departments.college())
                .query((rs, n) -> new Doc(rs.getString("doc_key"), json.readTree(rs.getString("data")),
                        rs.getInt("version"), rs.getString("updated_by"),
                        rs.getObject("updated_at", OffsetDateTime.class)))
                .list();
    }

    /** One evaluator the Dean can allot scripts to: a faculty or HOD account of the college. */
    public record Staff(String id, String name, String dept, String role) {
    }

    @GetMapping("/staff")
    List<Staff> staff() {
        CurrentUser user = CurrentUser.get();
        if (user.role() != Role.DEAN && user.role() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not available to this account");
        }
        return db.sql("""
                        SELECT u.username, u.display_name, d.code, u.role FROM users u
                        JOIN departments d ON d.dept_key = u.dept_key
                        WHERE u.role IN ('FACULTY', 'HOD') AND u.enabled AND d.college_key = ?
                        ORDER BY d.code, u.role DESC, u.display_name
                        """).param(departments.college())
                .query((rs, n) -> new Staff(rs.getString(1), rs.getString(2), rs.getString(3),
                        "HOD".equals(rs.getString(4)) ? "Chief Evaluator" : "Internal Examiner"))
                .list();
    }

    @PutMapping("/{key}")
    Map<String, Object> save(@PathVariable String key, @RequestBody SaveRequest req, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        Set<Role> writers = WRITERS.get(key);
        if (writers == null) throw ApiException.notFound("Unknown document");
        if (!writers.contains(user.role())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Your role cannot change this");
        }
        if (req == null || req.data() == null || req.data().isNull()) throw ApiException.badRequest("Data is required");
        String text = json.writeValueAsString(req.data());
        if (text.length() > MAX_CHARS) throw ApiException.badRequest("The document is too large");
        String college = departments.college();
        int version = db.sql("""
                        INSERT INTO workflow_documents (college_key, doc_key, data, updated_by)
                        VALUES (?, ?, CAST(? AS JSONB), ?)
                        ON CONFLICT (college_key, doc_key) DO UPDATE SET data = EXCLUDED.data,
                            version = workflow_documents.version + 1, updated_by = EXCLUDED.updated_by, updated_at = now()
                        RETURNING version
                        """).params(college, key, text, user.name()).query(Integer.class).single();
        audit.record(user.username(), user.name(), "SAVED_WORKFLOW_DOCUMENT", key,
                "Saved the shared " + key.replace("kvell_", "").replace('_', ' ') + " (version " + version + ").",
                http.getRemoteAddr());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("key", key);
        out.put("version", version);
        return out;
    }
}
