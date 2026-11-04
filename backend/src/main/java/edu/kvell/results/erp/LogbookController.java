package edu.kvell.results.erp;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Logbook and subject completion. Faculty add the syllabus (units and topics) of a subject once, then log each class:
 * date, period, topic covered, method and remarks. Completion % = topics covered / planned topics, so it updates by
 * itself. An entry can be edited for logbook.edit_days days after the class, then it locks. Faculty see their own
 * subjects; a class in-charge sees every subject of their class; the HOD their department; the Associate Dean the
 * college.
 */
@RestController
@RequestMapping("/api/erp/logbook")
public class LogbookController {

    static final Set<String> METHODS = Set.of("Lecture", "Tutorial", "Laboratory", "Seminar", "Flipped class",
            "Assignment discussion", "Revision", "Test", "Other");

    public record Subject(String deptKey, String deptName, int semester, String semesterLabel, String subjectCode,
                          String subjectTitle, List<String> sections, int topics, int covered, int percent, int behind,
                          String lastEntry) {
    }

    public record Topic(long id, int topicNo, String title, String plannedDate, boolean covered) {
    }

    public record Unit(long id, int unitNo, String title, int plannedHours, List<Topic> topics) {
    }

    public record TopicInput(String title, String plannedDate) {
    }

    public record UnitInput(Integer unitNo, String title, Integer plannedHours, List<TopicInput> topics) {
    }

    public record SyllabusRequest(String dept, String semester, String subject, List<UnitInput> units) {
    }

    public record EntryRequest(String dept, String semester, String section, String subject, String date, Integer period,
                               Long topicId, String topicText, String method, String remarks) {
    }

    public record Entry(long id, String date, int period, String section, Long topicId, String topic, String method,
                        String remarks, String faculty, boolean editable) {
    }

    /** facultyIds: the faculty the HOD allotted the subject to (for the HOD's allotment control). */
    public record Completion(String deptKey, int semester, String subjectCode, String subjectTitle, String faculty,
                             List<Long> facultyIds, int topics, int covered, int percent, int behind, String lastEntry,
                             boolean lagging) {
    }

    private final JdbcClient db;
    private final ErpSupport erp;
    private final Departments departments;

    public LogbookController(JdbcClient db, ErpSupport erp, Departments departments) {
        this.db = db;
        this.erp = erp;
        this.departments = departments;
    }

    /** The subjects the signed-in faculty member teaches (faculty_subjects), with their completion. */
    @GetMapping("/subjects")
    List<Subject> subjects() {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        List<Map<String, Object>> rows = db.sql("""
                        SELECT f.dept_key, d.name AS dept_name, f.semester, f.subject_code, coalesce(j.title, '') AS title
                        FROM faculty_subjects f JOIN departments d ON d.dept_key = f.dept_key
                        LEFT JOIN subjects j ON j.dept_key = f.dept_key AND j.semester = f.semester AND j.code = f.subject_code
                        WHERE f.user_id = ? ORDER BY f.semester, f.subject_code
                        """).param(me.id()).query().listOfRows();
        List<Subject> out = new ArrayList<>();
        for (Map<String, Object> r : rows) {
            String dept = (String) r.get("dept_key");
            int sem = ((Number) r.get("semester")).intValue();
            String code = (String) r.get("subject_code");
            int[] c = completion(dept, sem, code);
            List<String> sections = db.sql("SELECT DISTINCT section FROM students WHERE dept_key = ? AND semester = ? ORDER BY 1")
                    .params(dept, sem).query(String.class).list();
            out.add(new Subject(dept, (String) r.get("dept_name"), sem, Semesters.label(sem), code, (String) r.get("title"),
                    sections.isEmpty() ? List.of("A") : sections, c[0], c[1], percent(c), c[2], lastEntry(dept, sem, code)));
        }
        return out;
    }

    @GetMapping("/syllabus")
    List<Unit> syllabus(@RequestParam String dept, @RequestParam String semester, @RequestParam String subject) {
        String d = departments.key(dept);
        int sem = Semesters.parse(semester);
        String code = code(subject);
        requireView(d, sem, code);
        return units(d, sem, code);
    }

    /** Saves the syllabus: units and topics by number (existing topics keep their logbook entries). */
    @PutMapping("/syllabus")
    @Transactional
    List<Unit> saveSyllabus(@RequestBody SyllabusRequest req) {
        if (req == null || req.units() == null) throw ApiException.badRequest("Add the units");
        String d = departments.key(req.dept());
        int sem = Semesters.parse(req.semester());
        String code = code(req.subject());
        requireTeach(d, sem, code);
        if (req.units().size() > 20) throw ApiException.badRequest("At most 20 units");
        List<Integer> keepUnits = new ArrayList<>();
        int i = 0;
        for (UnitInput u : req.units()) {
            int no = u.unitNo() == null ? ++i : u.unitNo();
            i = no;
            String title = text(u.title(), "Unit " + no + " title", 200);
            int hours = u.plannedHours() == null ? 9 : Math.max(0, Math.min(200, u.plannedHours()));
            long unitId = db.sql("""
                            INSERT INTO syllabus_units (dept_key, semester, subject_code, unit_no, title, planned_hours)
                            VALUES (?, ?, ?, ?, ?, ?)
                            ON CONFLICT (dept_key, semester, subject_code, unit_no)
                            DO UPDATE SET title = EXCLUDED.title, planned_hours = EXCLUDED.planned_hours RETURNING id
                            """).params(d, sem, code, no, title, hours).query(Long.class).single();
            keepUnits.add(no);
            List<TopicInput> topics = u.topics() == null ? List.of() : u.topics();
            if (topics.size() > 60) throw ApiException.badRequest("At most 60 topics per unit");
            int t = 0;
            for (TopicInput tp : topics) {
                t++;
                LocalDate planned = tp.plannedDate() == null || tp.plannedDate().isBlank() ? null
                        : ClassInchargeController.date(tp.plannedDate(), "Planned date");
                db.sql("""
                                INSERT INTO syllabus_topics (unit_id, topic_no, title, planned_date) VALUES (?, ?, ?, ?)
                                ON CONFLICT (unit_id, topic_no) DO UPDATE SET title = EXCLUDED.title, planned_date = EXCLUDED.planned_date
                                """).params(unitId, t, text(tp.title(), "Topic title", 300), planned).update();
            }
            db.sql("DELETE FROM syllabus_topics WHERE unit_id = ? AND topic_no > ?").params(unitId, t).update();
        }
        if (keepUnits.isEmpty()) {
            db.sql("DELETE FROM syllabus_units WHERE dept_key = ? AND semester = ? AND subject_code = ?").params(d, sem, code).update();
        } else {
            db.sql("DELETE FROM syllabus_units WHERE dept_key = ? AND semester = ? AND subject_code = ? AND NOT (unit_no = ANY (?))")
                    .params(d, sem, code, keepUnits.toArray(new Integer[0])).update();
        }
        return units(d, sem, code);
    }

    @GetMapping("/entries")
    List<Entry> entries(@RequestParam String dept, @RequestParam String semester, @RequestParam String subject) {
        String d = departments.key(dept);
        int sem = Semesters.parse(semester);
        String code = code(subject);
        requireView(d, sem, code);
        CurrentUser me = CurrentUser.get();
        LocalDate lock = ErpSupport.today().minusDays(erp.intSetting("logbook.edit_days", 3));
        return db.sql("""
                        SELECT e.id, e.entry_date, e.period, e.section, e.topic_id, e.topic_text, e.method, e.remarks,
                               u.display_name, e.faculty_id
                        FROM logbook_entries e JOIN users u ON u.id = e.faculty_id
                        WHERE e.dept_key = ? AND e.semester = ? AND e.subject_code = ?
                        ORDER BY e.entry_date DESC, e.period DESC
                        """).params(d, sem, code)
                .query((rs, n) -> {
                    LocalDate date = rs.getObject("entry_date", LocalDate.class);
                    return new Entry(rs.getLong("id"), date.toString(), rs.getInt("period"), rs.getString("section"),
                            (Long) rs.getObject("topic_id"), rs.getString("topic_text"), rs.getString("method"),
                            rs.getString("remarks"), rs.getString("display_name"),
                            rs.getLong("faculty_id") == me.id() && !date.isBefore(lock));
                })
                .list();
    }

    @PostMapping("/entries")
    @Transactional
    Entry add(@RequestBody EntryRequest req) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        String d = departments.key(req.dept());
        int sem = Semesters.parse(req.semester());
        String code = code(req.subject());
        requireTeach(d, sem, code);
        LocalDate date = entryDate(req.date());
        long id = db.sql("""
                        INSERT INTO logbook_entries (dept_key, semester, section, subject_code, faculty_id, entry_date, period,
                                                     topic_id, topic_text, method, remarks)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (dept_key, semester, section, subject_code, entry_date, period) DO NOTHING RETURNING id
                        """).params(d, sem, ClassInchargeController.section(req.section() == null ? "A" : req.section()), code,
                        me.id(), date, period(req.period()), topicId(req.topicId(), d, sem, code), topicText(req, d, sem, code),
                        method(req.method()), LeaveController.clip(blank(req.remarks()), 500))
                .query(Long.class).optional()
                .orElseThrow(() -> ApiException.conflict("Period " + req.period() + " of " + date + " is already logged for this subject"));
        return entry(id);
    }

    @PutMapping("/entries/{id}")
    @Transactional
    Entry edit(@PathVariable long id, @RequestBody EntryRequest req) {
        Map<String, Object> e = editable(id);
        String d = (String) e.get("dept_key");
        int sem = ((Number) e.get("semester")).intValue();
        String code = (String) e.get("subject_code");
        db.sql("""
                        UPDATE logbook_entries SET topic_id = ?, topic_text = ?, method = ?, remarks = ?, period = ?, updated_at = now()
                        WHERE id = ?
                        """).params(topicId(req.topicId(), d, sem, code), topicText(req, d, sem, code), method(req.method()),
                        LeaveController.clip(blank(req.remarks()), 500), period(req.period()), id).update();
        return entry(id);
    }

    @DeleteMapping("/entries/{id}")
    Map<String, String> delete(@PathVariable long id) {
        editable(id);
        db.sql("DELETE FROM logbook_entries WHERE id = ?").param(id).update();
        return Map.of("status", "deleted");
    }

    /**
     * Completion of every subject of a department's semester: the HOD (own department), the Associate Dean (college),
     * a class in-charge (their class) or a faculty member (only the subjects they teach). Lagging = behind the plan.
     */
    @GetMapping("/completion")
    List<Completion> completion(@RequestParam String dept, @RequestParam(required = false) String semester) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        String d = departments.key(dept);
        if (me.role() == Role.HOD && !d.equals(me.deptKey())) throw new ApiException(HttpStatus.FORBIDDEN, "Only your department");
        Integer sem = semester == null || semester.isBlank() ? null : Semesters.parse(semester);
        List<Map<String, Object>> subjects = db.sql("""
                        SELECT j.code, j.title, j.semester,
                               (SELECT string_agg(DISTINCT u.display_name, ', ') FROM faculty_subjects f JOIN users u ON u.id = f.user_id
                                WHERE f.dept_key = j.dept_key AND f.semester = j.semester AND f.subject_code = j.code) AS faculty
                        FROM subjects j WHERE j.dept_key = ? AND (CAST(? AS SMALLINT) IS NULL OR j.semester = ?)
                        ORDER BY j.semester, j.code
                        """).params(d, sem, sem).query().listOfRows();
        List<Completion> out = new ArrayList<>();
        for (Map<String, Object> s : subjects) {
            int sm = ((Number) s.get("semester")).intValue();
            String code = (String) s.get("code");
            if (me.role() == Role.FACULTY && !inchargeOfSemester(me.id(), d, sm) && !teaches(me.id(), d, sm, code)) continue;
            int[] c = completion(d, sm, code);
            List<Long> ids = db.sql("SELECT user_id FROM faculty_subjects WHERE dept_key = ? AND semester = ? AND subject_code = ?")
                    .params(d, sm, code).query(Long.class).list();
            out.add(new Completion(d, sm, code, (String) s.get("title"), s.get("faculty") == null ? "Not allotted" : (String) s.get("faculty"),
                    ids, c[0], c[1], percent(c), c[2], lastEntry(d, sm, code), c[2] > 0));
        }
        return out;
    }

    // ---------------------------------------------------------------- rules

    /** {planned topics, covered topics, topics behind plan}. */
    int[] completion(String dept, int sem, String code) {
        return db.sql("""
                        SELECT count(t.id),
                               count(t.id) FILTER (WHERE EXISTS (SELECT 1 FROM logbook_entries e WHERE e.topic_id = t.id)),
                               count(t.id) FILTER (WHERE t.planned_date < current_date
                                   AND NOT EXISTS (SELECT 1 FROM logbook_entries e WHERE e.topic_id = t.id))
                        FROM syllabus_units u JOIN syllabus_topics t ON t.unit_id = u.id
                        WHERE u.dept_key = ? AND u.semester = ? AND u.subject_code = ?
                        """).params(dept, sem, code)
                .query((rs, n) -> new int[] {rs.getInt(1), rs.getInt(2), rs.getInt(3)}).single();
    }

    static int percent(int[] c) {
        return c[0] == 0 ? 0 : Math.round(c[1] * 100f / c[0]);
    }

    private String lastEntry(String dept, int sem, String code) {
        return db.sql("SELECT max(entry_date)::text FROM logbook_entries WHERE dept_key = ? AND semester = ? AND subject_code = ?")
                .params(dept, sem, code).query(String.class).optional().orElse(null);
    }

    private List<Unit> units(String d, int sem, String code) {
        return db.sql("SELECT id, unit_no, title, planned_hours FROM syllabus_units WHERE dept_key = ? AND semester = ? AND subject_code = ? ORDER BY unit_no")
                .params(d, sem, code)
                .query((rs, n) -> {
                    long id = rs.getLong("id");
                    List<Topic> topics = db.sql("""
                                    SELECT t.id, t.topic_no, t.title, t.planned_date::text,
                                           EXISTS (SELECT 1 FROM logbook_entries e WHERE e.topic_id = t.id) AS covered
                                    FROM syllabus_topics t WHERE t.unit_id = ? ORDER BY t.topic_no
                                    """).param(id).query((r2, m) -> new Topic(r2.getLong(1), r2.getInt(2), r2.getString(3),
                                    r2.getString(4), r2.getBoolean(5))).list();
                    return new Unit(id, rs.getInt("unit_no"), rs.getString("title"), rs.getInt("planned_hours"), topics);
                })
                .list();
    }

    boolean teaches(long userId, String dept, int sem, String code) {
        return db.sql("SELECT count(*) FROM faculty_subjects WHERE user_id = ? AND dept_key = ? AND semester = ? AND subject_code = ?")
                .params(userId, dept, sem, code).query(Integer.class).single() > 0;
    }

    private boolean inchargeOfSemester(long userId, String dept, int sem) {
        return db.sql("SELECT DISTINCT section FROM class_incharge WHERE faculty_user_id = ? AND dept_key = ? AND semester = ?")
                .params(userId, dept, sem).query(String.class).list().stream()
                .anyMatch(section -> erp.isIncharge(userId, dept, sem, section));
    }

    /** Teaching the subject (faculty), or the HOD of its department. */
    private void requireTeach(String dept, int sem, String code) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        if (me.role() == Role.HOD && dept.equals(me.deptKey())) return;
        if (!teaches(me.id(), dept, sem, code)) {
            throw new ApiException(HttpStatus.FORBIDDEN, code + " is not one of your subjects (the HOD allots subjects)");
        }
    }

    private void requireView(String dept, int sem, String code) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        if (me.role() == Role.DEAN) return;
        if (me.role() == Role.HOD && dept.equals(me.deptKey())) return;
        if (teaches(me.id(), dept, sem, code) || inchargeOfSemester(me.id(), dept, sem)) return;
        throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this subject");
    }

    private Map<String, Object> editable(long id) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        Map<String, Object> e = db.sql("SELECT * FROM logbook_entries WHERE id = ?").param(id).query().listOfRows().stream()
                .findFirst().orElseThrow(() -> ApiException.notFound("Logbook entry not found"));
        if (((Number) e.get("faculty_id")).longValue() != me.id()) throw new ApiException(HttpStatus.FORBIDDEN, "Only your own entries");
        LocalDate date = ((java.sql.Date) e.get("entry_date")).toLocalDate();
        int days = erp.intSetting("logbook.edit_days", 3);
        if (date.isBefore(ErpSupport.today().minusDays(days))) {
            throw ApiException.conflict("This entry is locked (entries can be edited for " + days + " days)");
        }
        return e;
    }

    private LocalDate entryDate(String v) {
        LocalDate date = ClassInchargeController.date(v, "Date");
        if (date.isAfter(ErpSupport.today())) throw ApiException.badRequest("The date cannot be in the future");
        int days = erp.intSetting("logbook.edit_days", 3);
        if (date.isBefore(ErpSupport.today().minusDays(days))) {
            throw ApiException.badRequest("Entries older than " + days + " days are locked");
        }
        return date;
    }

    private Long topicId(Long topicId, String dept, int sem, String code) {
        if (topicId == null) return null;
        int ok = db.sql("""
                        SELECT count(*) FROM syllabus_topics t JOIN syllabus_units u ON u.id = t.unit_id
                        WHERE t.id = ? AND u.dept_key = ? AND u.semester = ? AND u.subject_code = ?
                        """).params(topicId, dept, sem, code).query(Integer.class).single();
        if (ok == 0) throw ApiException.badRequest("That topic is not in this subject's syllabus");
        return topicId;
    }

    private String topicText(EntryRequest req, String dept, int sem, String code) {
        if (req.topicId() != null) {
            return db.sql("SELECT title FROM syllabus_topics WHERE id = ?").param(topicId(req.topicId(), dept, sem, code))
                    .query(String.class).single();
        }
        return text(req.topicText(), "Topic covered", 300);
    }

    private static int period(Integer p) {
        if (p == null || p < 1 || p > 10) throw ApiException.badRequest("Period: 1 to 10");
        return p;
    }

    private static String method(String m) {
        String v = m == null ? "" : m.trim();
        if (!METHODS.contains(v)) throw ApiException.badRequest("Teaching method: " + String.join(", ", METHODS));
        return v;
    }

    private static String code(String s) {
        if (s == null || s.isBlank()) throw ApiException.badRequest("Subject is required");
        return s.trim().toUpperCase(Locale.ROOT);
    }

    static String text(String v, String field, int max) {
        String t = v == null ? "" : v.trim();
        if (t.isEmpty()) throw ApiException.badRequest(field + " is required");
        if (t.length() > max) throw ApiException.badRequest(field + ": at most " + max + " characters");
        return t;
    }

    private static String blank(String v) {
        return v == null || v.isBlank() ? null : v.trim();
    }

    private Entry entry(long id) {
        Map<String, Object> e = db.sql("""
                        SELECT e.*, u.display_name FROM logbook_entries e JOIN users u ON u.id = e.faculty_id WHERE e.id = ?
                        """).param(id).query().singleRow();
        return new Entry(id, e.get("entry_date").toString(), ((Number) e.get("period")).intValue(), (String) e.get("section"),
                (Long) e.get("topic_id"), (String) e.get("topic_text"), (String) e.get("method"), (String) e.get("remarks"),
                (String) e.get("display_name"), true);
    }
}
