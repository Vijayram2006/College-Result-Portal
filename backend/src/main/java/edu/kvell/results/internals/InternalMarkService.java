package edu.kvell.results.internals;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/**
 * Internal marks, in two IAT cycles. Each cycle has its IAT (the answer-script total, out of 100) and its own quiz,
 * activity and assignment, giving that cycle's internal mark; the two cycle marks are converted into the end-semester
 * internal mark, plus attendance (hours attended out of the hours per subject, for the whole semester).
 *
 * <p>Faculty enter the values and the HOD corrects them (each for their own department); everyone else views them.
 *
 * <p>The formula is a per-college setting kept by the college's COE ({@link Config}), because the college has not
 * fixed it yet; until the COE marks it confirmed, every screen says it is provisional. Every value change is kept in
 * internal_mark_history, so students, HODs and the COE can see who changed what and when.
 */
@Service
public class InternalMarkService {

    /** quiz1 / activity1 / assignment1 belong to the IAT-1 cycle, quiz2 / ... to the IAT-2 cycle. */
    public static final List<String> COMPONENTS = List.of("quiz1", "activity1", "assignment1", "quiz2", "activity2",
            "assignment2", "attendance");
    static final Set<String> CYCLE_COMBINE = Set.of("AVERAGE", "BEST", "SUM");
    static final Set<String> ROUNDING = Set.of("NEAREST", "UP", "NONE");

    /** A component entered by the faculty: marks out of max, converted to marks out of weight. */
    public record Component(double max, double weight) {
    }

    /** Attendance of at least minPercent earns marks. */
    public record Slab(double minPercent, double marks) {
    }

    /**
     * The formula. Each IAT cycle: IAT % x iatWeight + quiz / max x weight + activity ... + assignment ... (the same
     * weights for both cycles). The two cycle marks combine as AVERAGE, BEST (the better cycle) or SUM. Attendance:
     * hours attended / hoursPerSubject gives the percentage; the highest slab reached gives the marks (no slabs:
     * percentage x weight).
     */
    public record Config(double iatWeight, Component quiz, Component activity, Component assignment,
                         String cycleCombine, double hoursPerSubject, double attendanceWeight,
                         List<Slab> attendanceSlabs, String rounding) {
        /** One cycle's internal mark is out of this. */
        double cycleMax() {
            return iatWeight + quiz.weight() + activity.weight() + assignment.weight();
        }

        double total() {
            return ("SUM".equals(cycleCombine) ? 2 * cycleMax() : cycleMax()) + attendanceWeight;
        }
    }

    /** Provisional starting formula: each cycle IAT 20 + quiz 5 + activity 5 + assignment 5 = 35, average of the
     * two cycles + attendance 5 = 40. To be replaced by the college's own. */
    static final Config DEFAULT = new Config(20, new Component(10, 5), new Component(10, 5), new Component(10, 5),
            "AVERAGE", 45, 5,
            List.of(new Slab(95, 5), new Slab(90, 4), new Slab(85, 3), new Slab(80, 2), new Slab(75, 1)), "NEAREST");

    public record Scheme(Config config, double maxMarks, boolean confirmed, boolean visibleToStudents,
                         String updatedBy, String updatedAt) {
    }

    /** One IAT cycle's converted marks and its internal mark (out of cycleMax). */
    public record Cycle(double iat, double quiz, double activity, double assignment, double total, double max) {
    }

    /**
     * Both cycles, their combined mark, attendance and the end-semester internal mark.
     * complete = every part in use has a value.
     */
    public record Breakdown(Cycle cycle1, Cycle cycle2, double cycles, double attendance, Double attendancePercent,
                            double total, double max, boolean complete) {
    }

    public record Row(String regNo, String name, String category, Map<String, Double> values, Double iat1,
                      Double iat2, Breakdown breakdown, String updatedBy, String updatedAt) {
    }

    public record Roster(String deptKey, String deptName, String semester, String subjectCode, String subjectTitle,
                         Scheme scheme, List<Row> rows) {
    }

    /** values: component -> value; a component left out is unchanged, a null value clears it. */
    public record RowInput(String regNo, Map<String, Double> values) {
    }

    public record SaveRequest(String semester, String subjectCode, List<RowInput> rows) {
    }

    public record HistoryItem(String regNo, String component, Double oldValue, Double newValue, String changedBy,
                              String changedAt) {
    }

    /** One subject on the student's own page. iat1/iat2 are shown only once that IAT is published. */
    public record StudentSubject(String subjectCode, String subjectTitle, Map<String, Double> values, Double iat1,
                                 Double iat2, boolean iat1Published, boolean iat2Published, Breakdown breakdown,
                                 String updatedAt) {
    }

    public record StudentView(boolean visible, Scheme scheme, String semester, List<StudentSubject> subjects) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final ObjectMapper json;

    public InternalMarkService(JdbcClient db, Departments departments, AuditService audit, ObjectMapper json) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
        this.json = json;
    }

    // ---------------------------------------------------------------- scheme

    public Scheme scheme(String college) {
        return db.sql("SELECT config, confirmed, visible_to_students, updated_by, updated_at FROM internal_schemes "
                        + "WHERE college_key = ?")
                .param(college)
                .query((rs, n) -> {
                    Config c = json.readValue(rs.getString("config"), Config.class);
                    return new Scheme(c, c.total(), rs.getBoolean("confirmed"), rs.getBoolean("visible_to_students"),
                            rs.getString("updated_by"),
                            Semesters.display(rs.getObject("updated_at", OffsetDateTime.class)));
                })
                .optional()
                .orElse(new Scheme(DEFAULT, DEFAULT.total(), false, true, null, null));
    }

    @Transactional
    public Scheme saveScheme(Config in, boolean confirmed, boolean visibleToStudents, String ip) {
        Config c = validate(in);
        String college = departments.college();
        CurrentUser user = CurrentUser.get();
        db.sql("""
                        INSERT INTO internal_schemes (college_key, config, confirmed, visible_to_students, updated_by)
                        VALUES (?, CAST(? AS jsonb), ?, ?, ?)
                        ON CONFLICT (college_key) DO UPDATE SET config = EXCLUDED.config,
                            confirmed = EXCLUDED.confirmed, visible_to_students = EXCLUDED.visible_to_students,
                            updated_by = EXCLUDED.updated_by, updated_at = now()
                        """)
                .params(college, json.writeValueAsString(c), confirmed, visibleToStudents, user.name()).update();
        audit.record(user.username(), user.name(), "UPDATED_INTERNAL_FORMULA", "Internal mark formula",
                "Set the internal mark formula (out of " + fmt(c.total()) + ", IAT cycles "
                        + c.cycleCombine().toLowerCase(Locale.ROOT)
                        + ", " + fmt(c.hoursPerSubject()) + " hours per subject; "
                        + (confirmed ? "confirmed" : "provisional") + ", "
                        + (visibleToStudents ? "shown to students" : "hidden from students") + ").", ip);
        return scheme(college);
    }

    static Config validate(Config c) {
        if (c == null) throw ApiException.badRequest("The formula is required");
        String combine = c.cycleCombine() == null ? "" : c.cycleCombine().trim().toUpperCase(Locale.ROOT);
        if (!CYCLE_COMBINE.contains(combine)) {
            throw ApiException.badRequest("How the two IAT cycles combine must be AVERAGE, BEST or SUM");
        }
        String rounding = c.rounding() == null ? "" : c.rounding().trim().toUpperCase(Locale.ROOT);
        if (!ROUNDING.contains(rounding)) throw ApiException.badRequest("Rounding must be NEAREST, UP or NONE");
        weight(c.iatWeight(), "IAT weight");
        Component quiz = component(c.quiz(), "Quiz");
        Component activity = component(c.activity(), "Activity");
        Component assignment = component(c.assignment(), "Assignment");
        weight(c.attendanceWeight(), "Attendance weight");
        if (c.hoursPerSubject() < 1 || c.hoursPerSubject() > 300) {
            throw ApiException.badRequest("Hours per subject must be between 1 and 300");
        }
        List<Slab> slabs = new ArrayList<>(c.attendanceSlabs() == null ? List.of() : c.attendanceSlabs());
        if (slabs.size() > 20) throw ApiException.badRequest("At most 20 attendance slabs");
        for (Slab s : slabs) {
            if (s == null || s.minPercent() < 0 || s.minPercent() > 100) {
                throw ApiException.badRequest("Attendance slab percentages must be 0-100");
            }
            if (s.marks() < 0 || s.marks() > c.attendanceWeight()) {
                throw ApiException.badRequest("Attendance slab marks must be between 0 and the attendance weight ("
                        + fmt(c.attendanceWeight()) + ")");
            }
        }
        if (slabs.stream().map(Slab::minPercent).distinct().count() != slabs.size()) {
            throw ApiException.badRequest("Two attendance slabs have the same percentage");
        }
        slabs.sort(Comparator.comparingDouble(Slab::minPercent).reversed());
        Config clean = new Config(c.iatWeight(), quiz, activity, assignment, combine, c.hoursPerSubject(),
                c.attendanceWeight(), slabs, rounding);
        if (clean.total() <= 0 || clean.total() > 100) {
            throw ApiException.badRequest("The weights must add up to between 1 and 100 (now " + fmt(clean.total()) + ")");
        }
        return clean;
    }

    private static void weight(double w, String label) {
        if (w < 0 || w > 100) throw ApiException.badRequest(label + " must be between 0 and 100");
    }

    private static Component component(Component c, String label) {
        if (c == null) throw ApiException.badRequest(label + " settings are required");
        weight(c.weight(), label + " weight");
        if (c.max() < 1 || c.max() > 100) throw ApiException.badRequest(label + " maximum must be between 1 and 100");
        return c;
    }

    // ---------------------------------------------------------------- calculation

    /** The internal mark from the entered values (component -> value) and the two IAT totals (out of 100). */
    public static Breakdown compute(Config c, Map<String, Double> v, Double iat1, Double iat2) {
        Cycle c1 = cycle(c, iat1, v.get("quiz1"), v.get("activity1"), v.get("assignment1"));
        Cycle c2 = cycle(c, iat2, v.get("quiz2"), v.get("activity2"), v.get("assignment2"));
        double cycles = switch (c.cycleCombine()) {
            case "BEST" -> Math.max(c1.total(), c2.total());
            case "SUM" -> c1.total() + c2.total();
            default -> (c1.total() + c2.total()) / 2;
        };
        Double hours = v.get("attendance");
        Double percent = hours == null ? null : Math.min(100, hours / c.hoursPerSubject() * 100);
        double attendance = 0;
        if (percent != null && c.attendanceWeight() > 0) {
            if (c.attendanceSlabs().isEmpty()) {
                attendance = percent / 100 * c.attendanceWeight();
            } else {
                for (Slab s : c.attendanceSlabs()) {
                    if (percent >= s.minPercent()) {
                        attendance = s.marks();
                        break;
                    }
                }
            }
        }
        double raw = cycles + attendance;
        double total = switch (c.rounding()) {
            case "UP" -> Math.ceil(raw - 1e-9);
            case "NONE" -> round1(raw);
            default -> Math.round(raw);
        };
        boolean complete = (c.iatWeight() == 0 || (iat1 != null && iat2 != null))
                && cycleEntered(c, v, "1") && cycleEntered(c, v, "2")
                && (c.attendanceWeight() == 0 || hours != null);
        return new Breakdown(c1, c2, round2(cycles), round2(attendance), percent == null ? null : round1(percent),
                total, c.total(), complete);
    }

    private static Cycle cycle(Config c, Double iat, Double quiz, Double activity, Double assignment) {
        double i = iat == null ? 0 : iat / 100 * c.iatWeight();
        double q = part(quiz, c.quiz());
        double a = part(activity, c.activity());
        double s = part(assignment, c.assignment());
        return new Cycle(round2(i), round2(q), round2(a), round2(s), round2(i + q + a + s), c.cycleMax());
    }

    private static boolean cycleEntered(Config c, Map<String, Double> v, String n) {
        return (c.quiz().weight() == 0 || v.get("quiz" + n) != null)
                && (c.activity().weight() == 0 || v.get("activity" + n) != null)
                && (c.assignment().weight() == 0 || v.get("assignment" + n) != null);
    }

    private static double part(Double value, Component c) {
        return value == null || c.weight() == 0 ? 0 : Math.min(value, c.max()) / c.max() * c.weight();
    }

    private static double round1(double x) {
        return Math.round(x * 10) / 10.0;
    }

    private static double round2(double x) {
        return Math.round(x * 100) / 100.0;
    }

    static String fmt(double x) {
        return x == Math.rint(x) ? String.valueOf((long) x) : String.valueOf(x);
    }

    // ---------------------------------------------------------------- roster (faculty / HOD / COE)

    public Roster roster(String deptKey, String semester, String subjectCode) {
        int sem = Semesters.parse(semester);
        String code = code(subjectCode);
        String title = subjectTitle(deptKey, sem, code);
        Scheme scheme = scheme(collegeOf(deptKey));
        Map<String, Map<String, Double>> values = new HashMap<>();
        Map<String, String[]> stamps = new HashMap<>();
        db.sql("""
                        SELECT reg_no, component, value, updated_by, updated_at FROM internal_marks
                        WHERE dept_key = ? AND semester = ? AND subject_code = ?
                        ORDER BY updated_at
                        """)
                .params(deptKey, sem, code)
                .query((rs, n) -> {
                    String reg = rs.getString("reg_no");
                    values.computeIfAbsent(reg, k -> new LinkedHashMap<>())
                            .put(rs.getString("component"), rs.getBigDecimal("value").doubleValue());
                    stamps.put(reg, new String[] {rs.getString("updated_by"),
                            Semesters.display(rs.getObject("updated_at", OffsetDateTime.class))});
                    return null;
                })
                .list();
        List<Row> rows = db.sql("""
                        SELECT s.reg_no, s.name, s.category,
                               (SELECT grand_total FROM marks m WHERE m.reg_no = s.reg_no AND m.dept_key = s.dept_key
                                  AND m.semester = s.semester AND m.subject_code = :code
                                  AND m.assessment_type = 'IAT-1') AS iat1,
                               (SELECT grand_total FROM marks m WHERE m.reg_no = s.reg_no AND m.dept_key = s.dept_key
                                  AND m.semester = s.semester AND m.subject_code = :code
                                  AND m.assessment_type = 'IAT-2') AS iat2
                        FROM students s WHERE s.dept_key = :dept AND s.semester = :sem
                        ORDER BY (s.category = 'lateral'), s.reg_no
                        """)
                .param("dept", deptKey).param("sem", sem).param("code", code)
                .query((rs, n) -> {
                    String reg = rs.getString("reg_no");
                    Map<String, Double> v = values.getOrDefault(reg, new LinkedHashMap<>());
                    Double iat1 = (Double) toDouble(rs.getObject("iat1"));
                    Double iat2 = (Double) toDouble(rs.getObject("iat2"));
                    String[] stamp = stamps.get(reg);
                    return new Row(reg, rs.getString("name"), rs.getString("category"), v, iat1, iat2,
                            compute(scheme.config(), v, iat1, iat2), stamp == null ? null : stamp[0],
                            stamp == null ? null : stamp[1]);
                })
                .list();
        return new Roster(deptKey, departments.name(deptKey), Semesters.label(sem), code, title, scheme, rows);
    }

    @Transactional
    public Roster save(String deptKey, SaveRequest r, String ip) {
        if (r == null || r.rows() == null) throw ApiException.badRequest("Nothing to save");
        int sem = Semesters.parse(r.semester());
        String code = code(r.subjectCode());
        String title = subjectTitle(deptKey, sem, code);
        Config c = scheme(collegeOf(deptKey)).config();
        if (r.rows().size() > 1000) throw ApiException.badRequest("At most 1000 students at a time");
        CurrentUser user = CurrentUser.get();
        int changed = 0;
        java.util.Set<String> students = new java.util.HashSet<>();
        for (RowInput row : r.rows()) {
            if (row == null || row.values() == null) continue;
            String reg = row.regNo() == null ? "" : row.regNo().trim().toUpperCase(Locale.ROOT);
            if (db.sql("SELECT count(*) FROM students WHERE reg_no = ? AND dept_key = ? AND semester = ?")
                    .params(reg, deptKey, sem).query(Integer.class).single() == 0) {
                throw ApiException.badRequest("Student " + reg + " is not in this department and semester");
            }
            for (Map.Entry<String, Double> e : row.values().entrySet()) {
                String comp = e.getKey() == null ? "" : e.getKey().trim().toLowerCase(Locale.ROOT);
                if (!COMPONENTS.contains(comp)) throw ApiException.badRequest("Unknown internal component: " + comp);
                Double value = e.getValue();
                if (value != null) {
                    double max = switch (comp.replaceAll("\\d$", "")) {
                        case "quiz" -> c.quiz().max();
                        case "activity" -> c.activity().max();
                        case "assignment" -> c.assignment().max();
                        default -> c.hoursPerSubject();
                    };
                    String label = comp.equals("attendance") ? "Attendance hours"
                            : capital(comp.replaceAll("\\d$", "")) + " (IAT-" + comp.substring(comp.length() - 1)
                            + ") marks";
                    if (value.isNaN() || value < 0 || value > max) {
                        throw ApiException.badRequest(label + " for " + reg + " must be between 0 and " + fmt(max));
                    }
                    if (Math.abs(value * 2 - Math.rint(value * 2)) > 1e-9) {
                        throw ApiException.badRequest(label + " for " + reg + " can only have .5 as a fraction");
                    }
                }
                BigDecimal old = db.sql("""
                                SELECT value FROM internal_marks
                                WHERE dept_key = ? AND semester = ? AND subject_code = ? AND reg_no = ? AND component = ?
                                """)
                        .params(deptKey, sem, code, reg, comp).query(BigDecimal.class).optional().orElse(null);
                Double oldValue = old == null ? null : old.doubleValue();
                if (java.util.Objects.equals(oldValue, value)) continue;
                if (value == null) {
                    db.sql("""
                                    DELETE FROM internal_marks
                                    WHERE dept_key = ? AND semester = ? AND subject_code = ? AND reg_no = ? AND component = ?
                                    """)
                            .params(deptKey, sem, code, reg, comp).update();
                } else {
                    db.sql("""
                                    INSERT INTO internal_marks (dept_key, semester, subject_code, reg_no, component, value,
                                                                updated_by)
                                    VALUES (?, ?, ?, ?, ?, ?, ?)
                                    ON CONFLICT (dept_key, semester, subject_code, reg_no, component) DO UPDATE SET
                                        value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()
                                    """)
                            .params(deptKey, sem, code, reg, comp, value, user.name()).update();
                }
                db.sql("""
                                INSERT INTO internal_mark_history (dept_key, semester, subject_code, reg_no, component,
                                                                   old_value, new_value, changed_by)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                                """)
                        .params(deptKey, sem, code, reg, comp, oldValue, value, user.name()).update();
                changed++;
                students.add(reg);
            }
        }
        if (changed > 0) {
            audit.record(user.username(), user.name(), "UPDATED_INTERNAL_MARKS", code + " " + Semesters.label(sem),
                    "Updated " + changed + " internal mark value(s) of " + students.size() + " student(s) in " + code
                            + " - " + title + " (" + deptKey.toUpperCase(Locale.ROOT) + ").", ip);
        }
        return roster(deptKey, Semesters.label(sem), code);
    }

    public List<HistoryItem> history(String deptKey, String semester, String subjectCode, String regNo) {
        int sem = Semesters.parse(semester);
        String code = code(subjectCode);
        String reg = regNo == null || regNo.isBlank() ? null : regNo.trim().toUpperCase(Locale.ROOT);
        return db.sql("""
                        SELECT reg_no, component, old_value, new_value, changed_by, changed_at
                        FROM internal_mark_history
                        WHERE dept_key = :dept AND semester = :sem AND subject_code = :code
                          AND (CAST(:reg AS VARCHAR) IS NULL OR reg_no = :reg)
                        ORDER BY changed_at DESC, id DESC LIMIT 500
                        """)
                .param("dept", deptKey).param("sem", sem).param("code", code).param("reg", reg)
                .query((rs, n) -> new HistoryItem(rs.getString("reg_no"), rs.getString("component"),
                        dbl(rs.getBigDecimal("old_value")), dbl(rs.getBigDecimal("new_value")),
                        rs.getString("changed_by"),
                        Semesters.display(rs.getObject("changed_at", OffsetDateTime.class))))
                .list();
    }

    // ---------------------------------------------------------------- student

    public StudentView forStudent(String regNo) {
        var s = db.sql("""
                        SELECT s.dept_key, s.semester, d.college_key FROM students s
                        JOIN departments d ON d.dept_key = s.dept_key WHERE s.reg_no = ?
                        """)
                .param(regNo).query().singleRow();
        String dept = (String) s.get("dept_key");
        int sem = ((Number) s.get("semester")).intValue();
        Scheme scheme = scheme((String) s.get("college_key"));
        if (!scheme.visibleToStudents()) return new StudentView(false, null, Semesters.label(sem), List.of());
        Map<String, Map<String, Double>> values = new HashMap<>();
        Map<String, String> updated = new HashMap<>();
        db.sql("SELECT subject_code, component, value, updated_at FROM internal_marks "
                        + "WHERE reg_no = ? AND dept_key = ? AND semester = ? ORDER BY updated_at")
                .params(regNo, dept, sem)
                .query((rs, n) -> {
                    values.computeIfAbsent(rs.getString("subject_code"), k -> new LinkedHashMap<>())
                            .put(rs.getString("component"), rs.getBigDecimal("value").doubleValue());
                    updated.put(rs.getString("subject_code"),
                            Semesters.display(rs.getObject("updated_at", OffsetDateTime.class)));
                    return null;
                })
                .list();
        // An IAT counts on the student's page only once it is published (until then it is shown as awaited)
        List<StudentSubject> subjects = db.sql("""
                        SELECT j.code, j.title,
                               (SELECT m.grand_total FROM marks m WHERE m.reg_no = :reg AND m.dept_key = j.dept_key
                                  AND m.semester = j.semester AND m.subject_code = j.code
                                  AND m.assessment_type = 'IAT-1') AS iat1,
                               (SELECT m.grand_total FROM marks m WHERE m.reg_no = :reg AND m.dept_key = j.dept_key
                                  AND m.semester = j.semester AND m.subject_code = j.code
                                  AND m.assessment_type = 'IAT-2') AS iat2,
                               EXISTS (SELECT 1 FROM result_batches b WHERE b.dept_key = j.dept_key
                                  AND b.semester = j.semester AND b.subject_code = j.code
                                  AND b.assessment_type = 'IAT-1' AND b.status = 'PUBLISHED') AS iat1_pub,
                               EXISTS (SELECT 1 FROM result_batches b WHERE b.dept_key = j.dept_key
                                  AND b.semester = j.semester AND b.subject_code = j.code
                                  AND b.assessment_type = 'IAT-2' AND b.status = 'PUBLISHED') AS iat2_pub
                        FROM subjects j WHERE j.dept_key = :dept AND j.semester = :sem ORDER BY j.code
                        """)
                .param("reg", regNo).param("dept", dept).param("sem", sem)
                .query((rs, n) -> {
                    String code = rs.getString("code");
                    boolean p1 = rs.getBoolean("iat1_pub");
                    boolean p2 = rs.getBoolean("iat2_pub");
                    Double iat1 = p1 ? (Double) toDouble(rs.getObject("iat1")) : null;
                    Double iat2 = p2 ? (Double) toDouble(rs.getObject("iat2")) : null;
                    Map<String, Double> v = values.getOrDefault(code, Map.of());
                    return new StudentSubject(code, rs.getString("title"), v, iat1, iat2, p1, p2,
                            compute(scheme.config(), v, iat1, iat2), updated.get(code));
                })
                .list();
        return new StudentView(true, scheme, Semesters.label(sem), subjects);
    }

    public List<HistoryItem> studentHistory(String regNo, String subjectCode) {
        String code = code(subjectCode);
        return db.sql("""
                        SELECT reg_no, component, old_value, new_value, changed_by, changed_at
                        FROM internal_mark_history WHERE reg_no = ? AND subject_code = ?
                        ORDER BY changed_at DESC, id DESC LIMIT 200
                        """)
                .params(regNo, code)
                .query((rs, n) -> new HistoryItem(rs.getString("reg_no"), rs.getString("component"),
                        dbl(rs.getBigDecimal("old_value")), dbl(rs.getBigDecimal("new_value")),
                        rs.getString("changed_by"),
                        Semesters.display(rs.getObject("changed_at", OffsetDateTime.class))))
                .list();
    }

    // ---------------------------------------------------------------- helpers

    private String subjectTitle(String deptKey, int sem, String code) {
        return db.sql("SELECT title FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?")
                .params(deptKey, sem, code).query(String.class).optional()
                .orElseThrow(() -> ApiException.badRequest("Subject " + code + " is not in this department's "
                        + Semesters.label(sem) + " catalog"));
    }

    private String collegeOf(String deptKey) {
        return db.sql("SELECT college_key FROM departments WHERE dept_key = ?").param(deptKey)
                .query(String.class).single();
    }

    private static String code(String subjectCode) {
        String c = subjectCode == null ? "" : subjectCode.trim().toUpperCase(Locale.ROOT);
        if (c.isEmpty()) throw ApiException.badRequest("Subject is required");
        return c;
    }

    private static Object toDouble(Object o) {
        return o == null ? null : ((Number) o).doubleValue();
    }

    private static Double dbl(BigDecimal b) {
        return b == null ? null : b.doubleValue();
    }

    private static String capital(String s) {
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
