package edu.kvell.results.allotments;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import edu.kvell.results.marks.AnonymousEvaluation;
import edu.kvell.results.marks.MarkService;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Paper-correction allotment, made by the COE: for each subject's assessment the COE picks the evaluating faculty and
 * the answer scripts are split equally between them, in the subject's evaluation order (dummy numbers, sorted). Each
 * evaluator sees and marks only their own bundle of positions. The Associate Dean and the HODs follow the progress;
 * the evaluators, their HOD and the Associate Dean are notified of every allotment.
 */
@Service
public class PaperAllotmentService {

    public static final int MAX_EVALUATORS = 20;

    /** A faculty member the COE can allot scripts to. */
    public record Evaluator(long id, String username, String name, String deptKey, String deptCode, String designation) {
    }

    /** One evaluator's bundle of a subject: script positions first..last, and how many of them are marked. */
    public record Bundle(long evaluatorId, String username, String name, String deptCode, int first, int last,
                         int scripts, int evaluated, double average) {
    }

    /** One subject of a department's semester, with its answer scripts and the evaluators allotted to it. */
    public record SubjectAllotment(String subjectCode, String subjectTitle, int scripts, int evaluated,
                                   String allottedBy, String allottedAt, List<Bundle> bundles) {
    }

    /** A faculty member's own bundle, for their Paper Correction screen. */
    public record MyBundle(String deptKey, String deptName, String semester, String subjectCode, String subjectTitle,
                           String assessment, int first, int last, int scripts, int evaluated, int subjectScripts,
                           int subjectEvaluated, String allottedBy, String allottedAt) {
    }

    public record AllotRequest(String dept, String semester, String subject, String assessment,
                               List<Long> evaluatorIds) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final AnonymousEvaluation anonymous;
    private final NotificationService notifications;
    private final AuditService audit;

    public PaperAllotmentService(JdbcClient db, Departments departments, AnonymousEvaluation anonymous,
                                 NotificationService notifications, AuditService audit) {
        this.db = db;
        this.departments = departments;
        this.anonymous = anonymous;
        this.notifications = notifications;
        this.audit = audit;
    }

    /** The college's enabled faculty accounts (evaluators may correct another department's papers). */
    public List<Evaluator> evaluators() {
        return db.sql("""
                        SELECT u.id, u.username, u.display_name, u.dept_key, coalesce(d.code, upper(d.dept_key)) AS code,
                               coalesce(f.designation, u.designation, '') AS designation
                        FROM users u JOIN departments d ON d.dept_key = u.dept_key
                        LEFT JOIN faculty_master f ON f.user_id = u.id
                        WHERE u.role = 'FACULTY' AND u.enabled AND d.college_key = ?
                        ORDER BY d.code, u.display_name
                        """).param(departments.college())
                .query((rs, n) -> new Evaluator(rs.getLong("id"), rs.getString("username"),
                        rs.getString("display_name"), rs.getString("dept_key"), rs.getString("code"),
                        rs.getString("designation")))
                .list();
    }

    /** Every subject of a department's semester for one assessment, with its allotment and live progress. */
    public List<SubjectAllotment> list(String dept, String semester, String assessment) {
        String deptKey = departments.key(dept);
        int sem = Semesters.parse(semester);
        String a = MarkService.assessment(assessment);
        List<Map<String, Object>> subjects = db.sql("""
                        SELECT code, title FROM subjects WHERE dept_key = ? AND semester = ? ORDER BY code
                        """).params(deptKey, sem).query().listOfRows();
        List<SubjectAllotment> out = new ArrayList<>();
        for (Map<String, Object> s : subjects) {
            String code = (String) s.get("code");
            List<MarkService.StudentMark> order = anonymous.evaluationOrder(deptKey, Semesters.label(sem), code, a);
            List<Map<String, Object>> rows = rows(deptKey, sem, code, a);
            List<Bundle> bundles = rows.stream().map(r -> bundle(r, order)).toList();
            int evaluated = (int) order.stream().filter(MarkService.StudentMark::hasMarks).count();
            Map<String, Object> first = rows.isEmpty() ? null : rows.get(0);
            out.add(new SubjectAllotment(code, (String) s.get("title"), order.size(), evaluated,
                    first == null ? null : (String) first.get("allotted_by"),
                    first == null ? null : when(first.get("allotted_at")),
                    bundles));
        }
        return out;
    }

    /** Allots a subject's answer scripts equally to the chosen evaluators (replacing its earlier allotment). */
    @Transactional
    public SubjectAllotment allot(AllotRequest req, CurrentUser coe, String ip) {
        if (req == null) throw ApiException.badRequest("Choose the subject and the evaluators");
        String deptKey = departments.key(req.dept());
        int sem = Semesters.parse(req.semester());
        String code = MarkService.normalizeCode(req.subject());
        String a = MarkService.assessment(req.assessment());
        String title = subjectTitle(deptKey, sem, code);
        List<Long> ids = req.evaluatorIds() == null ? List.of() : List.copyOf(new LinkedHashSet<>(req.evaluatorIds()));
        if (ids.isEmpty()) throw ApiException.badRequest("Choose at least one evaluator");
        if (ids.size() > MAX_EVALUATORS) throw ApiException.badRequest("At most " + MAX_EVALUATORS + " evaluators per subject");
        Map<Long, Evaluator> pool = evaluators().stream().collect(Collectors.toMap(Evaluator::id, e -> e));
        List<Evaluator> chosen = new ArrayList<>();
        for (Long id : ids) {
            Evaluator e = pool.get(id);
            if (e == null) throw ApiException.badRequest("Evaluator " + id + " is not an active faculty member of this college");
            chosen.add(e);
        }
        int scripts = anonymous.evaluationOrder(deptKey, Semesters.label(sem), code, a).size();
        if (scripts == 0) throw ApiException.badRequest("There are no answer scripts to correct for " + code);
        if (chosen.size() > scripts) {
            throw ApiException.badRequest(code + " has only " + scripts + " scripts: choose at most " + scripts + " evaluators");
        }

        List<Long> before = db.sql("""
                        SELECT evaluator_id FROM paper_allotments
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND assessment_type = ?
                        """).params(deptKey, sem, code, a).query(Long.class).list();
        db.sql("DELETE FROM paper_allotments WHERE dept_key = ? AND semester = ? AND subject_code = ? AND assessment_type = ?")
                .params(deptKey, sem, code, a).update();
        // Equal split: the first (scripts % n) evaluators take one script more
        int base = scripts / chosen.size();
        int extra = scripts % chosen.size();
        int next = 1;
        List<String> summary = new ArrayList<>();
        for (int i = 0; i < chosen.size(); i++) {
            Evaluator e = chosen.get(i);
            int count = base + (i < extra ? 1 : 0);
            int last = next + count - 1;
            db.sql("""
                            INSERT INTO paper_allotments (dept_key, semester, subject_code, assessment_type, evaluator_id,
                                                          first_script, last_script, allotted_by)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """).params(deptKey, sem, code, a, e.id(), next, last, coe.name()).update();
            notifications.notifyUser(e.id(), Audience.FACULTY, e.deptKey(), null,
                    "Paper correction allotted: " + code,
                    "The COE allotted you " + count + " answer scripts (scripts " + next + "–" + last + ") of " + code
                            + " " + title + ", " + Semesters.label(sem) + " " + a + ". Open Paper Correction to evaluate them.",
                    "paper-correction");
            summary.add(e.name() + " " + next + "–" + last);
            next = last + 1;
        }
        // Evaluators who were removed from the subject are told so
        for (Long old : before) {
            if (ids.contains(old)) continue;
            Evaluator e = pool.get(old);
            if (e != null) {
                notifications.notifyUser(e.id(), Audience.FACULTY, e.deptKey(), null,
                        "Paper correction changed: " + code,
                        "The COE moved the " + code + " " + a + " answer scripts to other evaluators. They are no longer in your Paper Correction.",
                        "paper-correction");
            }
        }
        String what = code + " " + title + " (" + Semesters.label(sem) + ", " + a + ")";
        String body = "The COE allotted the " + scripts + " answer scripts of " + what + " to " + chosen.size()
                + (chosen.size() == 1 ? " evaluator: " : " evaluators: ") + String.join(", ", summary) + ".";
        notifications.notify(Audience.HOD, deptKey, sem, "Paper correction allotted: " + code, body, "paper-correction");
        notifications.notify(Audience.DEAN, deptKey, sem, "Paper correction allotted: " + code, body, "paper-correction");
        audit.record(coe.username(), coe.name(), "ALLOTTED_PAPER_CORRECTION", deptKey.toUpperCase(Locale.ROOT) + " " + code,
                body, ip);
        return list(deptKey, Semesters.label(sem), a).stream().filter(s -> s.subjectCode().equals(code)).findFirst()
                .orElseThrow();
    }

    /** Cancels a subject's allotment; its evaluators are told. */
    @Transactional
    public void cancel(String dept, String semester, String subject, String assessment, CurrentUser coe, String ip) {
        String deptKey = departments.key(dept);
        int sem = Semesters.parse(semester);
        String code = MarkService.normalizeCode(subject);
        String a = MarkService.assessment(assessment);
        List<Map<String, Object>> removed = db.sql("""
                        DELETE FROM paper_allotments p USING users u
                        WHERE u.id = p.evaluator_id AND p.dept_key = ? AND p.semester = ? AND p.subject_code = ?
                          AND p.assessment_type = ?
                        RETURNING u.id, u.dept_key
                        """).params(deptKey, sem, code, a).query().listOfRows();
        if (removed.isEmpty()) throw ApiException.notFound(code + " " + a + " has no allotment");
        for (Map<String, Object> r : removed) {
            notifications.notifyUser(((Number) r.get("id")).longValue(), Audience.FACULTY, (String) r.get("dept_key"), null,
                    "Paper correction cancelled: " + code,
                    "The COE cancelled your " + code + " " + a + " paper-correction allotment.", "paper-correction");
        }
        audit.record(coe.username(), coe.name(), "CANCELLED_PAPER_CORRECTION", deptKey.toUpperCase(Locale.ROOT) + " " + code,
                "Cancelled the paper-correction allotment of " + code + " (" + Semesters.label(sem) + ", " + a + ").", ip);
    }

    /** The signed-in faculty member's bundles, with their progress. */
    public List<MyBundle> mine(CurrentUser user) {
        List<Map<String, Object>> rows = db.sql("""
                        SELECT p.dept_key, d.name AS dept_name, p.semester, p.subject_code, coalesce(j.title, '') AS title,
                               p.assessment_type, p.first_script, p.last_script, p.allotted_by, p.allotted_at
                        FROM paper_allotments p JOIN departments d ON d.dept_key = p.dept_key
                        LEFT JOIN subjects j ON j.dept_key = p.dept_key AND j.semester = p.semester AND j.code = p.subject_code
                        WHERE p.evaluator_id = ?
                        ORDER BY p.allotted_at DESC, p.subject_code
                        """).param(user.id()).query().listOfRows();
        List<MyBundle> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            String deptKey = (String) r.get("dept_key");
            int sem = ((Number) r.get("semester")).intValue();
            String code = (String) r.get("subject_code");
            String a = (String) r.get("assessment_type");
            List<MarkService.StudentMark> order = anonymous.evaluationOrder(deptKey, Semesters.label(sem), code, a);
            int first = ((Number) r.get("first_script")).intValue();
            int last = Math.min(((Number) r.get("last_script")).intValue(), order.size());
            List<MarkService.StudentMark> mine = first > last ? List.of() : order.subList(first - 1, last);
            out.add(new MyBundle(deptKey, (String) r.get("dept_name"), Semesters.label(sem), code, (String) r.get("title"), a,
                    first, last, mine.size(), (int) mine.stream().filter(MarkService.StudentMark::hasMarks).count(),
                    order.size(), (int) order.stream().filter(MarkService.StudentMark::hasMarks).count(),
                    (String) r.get("allotted_by"),
                    when(r.get("allotted_at"))));
        }
        return out;
    }

    /** An evaluator's script positions (first, last) of a subject's assessment, if the COE allotted them some. */
    public Optional<int[]> range(long userId, String deptKey, int semester, String code, String assessment) {
        return db.sql("""
                        SELECT first_script, last_script FROM paper_allotments
                        WHERE evaluator_id = ? AND dept_key = ? AND semester = ? AND subject_code = ? AND assessment_type = ?
                        """).params(userId, deptKey, semester, code, assessment)
                .query((rs, n) -> new int[] {rs.getInt(1), rs.getInt(2)}).optional();
    }

    private List<Map<String, Object>> rows(String deptKey, int sem, String code, String a) {
        return db.sql("""
                        SELECT p.evaluator_id, u.username, u.display_name, coalesce(d.code, upper(d.dept_key)) AS dept_code,
                               p.first_script, p.last_script, p.allotted_by, p.allotted_at
                        FROM paper_allotments p JOIN users u ON u.id = p.evaluator_id
                        JOIN departments d ON d.dept_key = u.dept_key
                        WHERE p.dept_key = ? AND p.semester = ? AND p.subject_code = ? AND p.assessment_type = ?
                        ORDER BY p.first_script
                        """).params(deptKey, sem, code, a).query().listOfRows();
    }

    private static Bundle bundle(Map<String, Object> r, List<MarkService.StudentMark> order) {
        int first = ((Number) r.get("first_script")).intValue();
        int last = Math.min(((Number) r.get("last_script")).intValue(), order.size());
        List<MarkService.StudentMark> mine = first > last ? List.of() : order.subList(first - 1, last);
        List<MarkService.StudentMark> done = mine.stream().filter(MarkService.StudentMark::hasMarks).toList();
        double avg = done.isEmpty() ? 0 : Math.round(done.stream().mapToInt(MarkService.StudentMark::grandTotal).average()
                .orElse(0) * 10) / 10.0;
        return new Bundle(((Number) r.get("evaluator_id")).longValue(), (String) r.get("username"),
                (String) r.get("display_name"), (String) r.get("dept_code"), first, last, mine.size(), done.size(), avg);
    }

    /** A timestamp column of a listOfRows() row, in the UI's format. */
    private static String when(Object value) {
        if (value instanceof java.sql.Timestamp ts) return Semesters.display(ts.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return value instanceof java.time.OffsetDateTime t ? Semesters.display(t) : null;
    }

    private String subjectTitle(String deptKey, int sem, String code) {
        return db.sql("SELECT title FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?")
                .params(deptKey, sem, code).query(String.class).optional()
                .orElseThrow(() -> ApiException.badRequest(code + " is not a " + Semesters.label(sem) + " subject of this department"));
    }
}
