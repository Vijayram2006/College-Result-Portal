package edu.kvell.results.coassessment;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.simple.JdbcClient;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * CO assessment as in the college's R2026 CO attainment sheets (Theory course and Integrated course workbooks). The
 * question layout, the CO of every question and every formula are copied from the workbooks:
 * <ul>
 * <li>IAT (from the answer-script mark entry): CO1 = IAT-1 Q1-4 + 11a/b + 12a/b; CO2 = IAT-1 Q5-8 + 13a/b + 14a/b;
 * CO3 = IAT-1 Q9-10 + 15a/b + IAT-2 Q1-2 + 11a/b; CO4 = IAT-2 Q3-6 + 12a/b + 13a/b; CO5 = IAT-2 Q7-10 + 14a/b + 15a/b
 * (each out of 34); CO6 = 16a/b of both IATs (out of 30).</li>
 * <li>Quiz (Theory): 25 one-mark questions per quiz; CO1 = Quiz-1 Q1-10, CO2 = Q11-20, CO3 = Quiz-1 Q21-25 + Quiz-2
 * Q1-5, CO4 = Quiz-2 Q6-15, CO5 = Q16-25 (each out of 10).</li>
 * <li>Practicals (Integrated): 10 experiments of 10 marks; CO1 = experiments 1-2 ... CO5 = 9-10 (each out of 20).</li>
 * <li>Assignment: 5 questions of 10 marks per assignment; CO1 = A1 Q1-2, CO2 = A1 Q3-4, CO3 = A1 Q5 + A2 Q1,
 * CO4 = A2 Q2-3, CO5 = A2 Q4-5 (each out of 20).</li>
 * <li>Activity: 5 activities of 50 marks, all CO6 (out of 250).</li>
 * <li>Integrated courses have no assignment (the college's decision): there CO1-5 = AVERAGE(IAT %, Lab %).</li>
 * <li>Internal attainment: CO1-5 = AVERAGE(IAT %, Assignment %, Quiz %), CO6 = AVERAGE(IAT %, Activity %);
 * students with &gt;= 50 are counted; level = IF(%&gt;60,3,IF(%&gt;40,2,IF(%&gt;30,1,0))).</li>
 * <li>University exam: grade point (S 10, A+ 9, A 8, B+ 7, B 6, C 5, U 0, anything else 0) / 6 for every CO, as a
 * percentage of 10/6; level as above but 1 when below 30.</li>
 * <li>Exit survey: % of 5 and 4 ratings; level = IF(%&gt;80,3,IF(%&gt;70,2,IF(%&gt;60,1,0))).</li>
 * <li>Overall: A = 0.5 x SEE + 0.5 x IAT, B = 90% of A, D = 10% of the exit survey level, E = B + D, % = E / 3.</li>
 * </ul>
 * Missing marks count as 0, as blank cells do in the workbook.
 */
@Service
public class CoAssessmentService {

    /** One entry component: its items (questions / experiments / activities / COs), each with its maximum and CO. */
    public record Component(String key, String title, String cycle, String courseType, List<Item> items) {
    }

    public record Item(String label, double max, String co) {
    }

    static final Map<String, Component> COMPONENTS = new LinkedHashMap<>();

    static {
        COMPONENTS.put("QUIZ1", new Component("QUIZ1", "Technical Quiz 1", "IAT-1", "THEORY",
                items(25, 1, i -> i <= 10 ? "CO1" : i <= 20 ? "CO2" : "CO3", "Q")));
        COMPONENTS.put("QUIZ2", new Component("QUIZ2", "Technical Quiz II", "IAT-2", "THEORY",
                items(25, 1, i -> i <= 5 ? "CO3" : i <= 15 ? "CO4" : "CO5", "Q")));
        COMPONENTS.put("ASSIGN1", new Component("ASSIGN1", "Assignment 1", "IAT-1", "THEORY",
                items(5, 10, i -> i <= 2 ? "CO1" : i <= 4 ? "CO2" : "CO3", "Q")));
        COMPONENTS.put("ASSIGN2", new Component("ASSIGN2", "Assignment II", "IAT-2", "THEORY",
                items(5, 10, i -> i == 1 ? "CO3" : i <= 3 ? "CO4" : "CO5", "Q")));
        COMPONENTS.put("PRACTICAL", new Component("PRACTICAL", "Continuous Assessment (Laboratory)", null, "INTEGRATED",
                items(10, 10, i -> "CO" + ((i + 1) / 2), "Expt ")));
        COMPONENTS.put("ACTIVITY", new Component("ACTIVITY", "Activities", null, null,
                List.of(new Item("Activity I", 50, "CO6"), new Item("Activity II", 50, "CO6"),
                        new Item("Activity III", 50, "CO6"), new Item("Activity IV", 50, "CO6"),
                        new Item("Activity V", 50, "CO6"))));
        COMPONENTS.put("EXIT_SURVEY", new Component("EXIT_SURVEY", "Course Exit Survey (1-5)", null, null,
                List.of(new Item("CO1", 5, "CO1"), new Item("CO2", 5, "CO2"), new Item("CO3", 5, "CO3"),
                        new Item("CO4", 5, "CO4"), new Item("CO5", 5, "CO5"), new Item("CO6", 5, "CO6"))));
    }

    private static List<Item> items(int n, double max, java.util.function.IntFunction<String> co, String prefix) {
        List<Item> list = new ArrayList<>();
        for (int i = 1; i <= n; i++) list.add(new Item(prefix + i, max, co.apply(i)));
        return List.copyOf(list);
    }

    /** IAT layout of the workbook: question, choice and CO; Part A Q1-10 (2 marks), Part B Q11-15 a/b (13), Q16 (15). */
    public record IatColumn(String label, String co, double max) {
    }

    static List<IatColumn> iatColumns(String cycle) {
        boolean first = "IAT-1".equals(cycle);
        String[] partA = first ? new String[] {"CO1", "CO1", "CO1", "CO1", "CO2", "CO2", "CO2", "CO2", "CO3", "CO3"}
                : new String[] {"CO3", "CO3", "CO4", "CO4", "CO4", "CO4", "CO5", "CO5", "CO5", "CO5"};
        String[] partB = first ? new String[] {"CO1", "CO1", "CO2", "CO2", "CO3"}
                : new String[] {"CO3", "CO4", "CO4", "CO5", "CO5"};
        List<IatColumn> cols = new ArrayList<>();
        for (int q = 1; q <= 10; q++) cols.add(new IatColumn(String.valueOf(q), partA[q - 1], 2));
        for (int q = 11; q <= 15; q++) {
            cols.add(new IatColumn(q + "a", partB[q - 11], 13));
            cols.add(new IatColumn(q + "b", partB[q - 11], 13));
        }
        cols.add(new IatColumn("16a", "CO6", 15));
        cols.add(new IatColumn("16b", "CO6", 15));
        return cols;
    }

    static final List<String> COS = List.of("CO1", "CO2", "CO3", "CO4", "CO5", "CO6");
    /** IAT CO maximums as typed in the workbook (BF, BI, BL, BO, BR = 34; BU = 30). */
    static final double[] IAT_CO_MAX = {34, 34, 34, 34, 34, 30};

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final ObjectMapper json;

    public CoAssessmentService(JdbcClient db, Departments departments, AuditService audit, ObjectMapper json) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
        this.json = json;
    }

    // ------------------------------------------------------------------------------------------------- the sheet

    public record StudentRow(String regNo, String name, Map<String, List<Double>> marks, List<Double> iat) {
    }

    /** Everything the entry screen shows for one subject and IAT cycle. */
    public record Sheet(String deptKey, String deptName, String semester, String subjectCode, String subjectTitle,
                        String courseType, boolean courseTypeLocked, String cycle, List<Component> components,
                        List<IatColumn> iatColumns, List<StudentRow> students, SurveyWindow surveyWindow) {
    }

    public Sheet sheet(String dept, String semester, String subject, String cycle, String courseType) {
        Subject s = subject(dept, semester, subject);
        String c = cycle(cycle);
        String stored = storedType(s);
        String type = stored != null ? stored : courseType == null || courseType.isBlank() ? guessType(s.code)
                : courseType(courseType);
        List<Component> comps = COMPONENTS.values().stream()
                .filter(x -> x.courseType() == null || x.courseType().equals(type))
                .filter(x -> x.cycle() == null || x.cycle().equals(c))
                .toList();
        Map<String, Map<String, List<Double>>> entries = entries(s);
        Map<String, List<Double>> iat = iatMarks(s, c);
        List<StudentRow> rows = students(s).stream().map(st -> {
            Map<String, List<Double>> mine = new LinkedHashMap<>();
            for (Component comp : comps) mine.put(comp.key(), entries.getOrDefault(comp.key(), Map.of()).get(st[0]));
            return new StudentRow(st[0], st[1], mine, iat.get(st[0]));
        }).toList();
        return new Sheet(s.dept, departments.name(s.dept), Semesters.label(s.sem), s.code, s.title, type, stored != null,
                c, comps, iatColumns(c), rows, window(s));
    }

    public record SaveRequest(String semester, String subjectCode, String courseType, String component,
                              List<RowInput> rows) {
    }

    public record RowInput(String regNo, List<Double> marks) {
    }

    /** Saves one component's marks for the listed students (faculty and HOD, own department only). */
    @Transactional
    public int save(String dept, SaveRequest req, CurrentUser user, String ip) {
        if (req == null || req.rows() == null) throw ApiException.badRequest("Marks are required");
        Subject s = subject(dept, req.semester(), req.subjectCode());
        Component comp = COMPONENTS.get(req.component() == null ? "" : req.component().trim().toUpperCase(Locale.ROOT));
        if (comp == null) throw ApiException.badRequest("Unknown component");
        if ("EXIT_SURVEY".equals(comp.key())) {
            throw ApiException.badRequest("The course exit survey is filled by the students in the student portal");
        }
        String type = courseType(req.courseType());
        String stored = storedType(s);
        if (stored != null && !stored.equals(type)) {
            throw ApiException.conflict("This subject is already set as " + stored.toLowerCase(Locale.ROOT)
                    + "; the course type cannot change once marks are entered");
        }
        if (comp.courseType() != null && !comp.courseType().equals(type)) {
            throw ApiException.badRequest(comp.title() + " is only for " + comp.courseType().toLowerCase(Locale.ROOT)
                    + " courses");
        }
        if (stored == null) {
            db.sql("""
                            INSERT INTO co_course_types (dept_key, semester, subject_code, course_type, updated_by)
                            VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
                            """).params(s.dept, s.sem, s.code, type, user.name()).update();
        }
        java.util.Set<String> roster = new java.util.HashSet<>(students(s).stream().map(x -> x[0]).toList());
        int saved = 0;
        for (RowInput r : req.rows()) {
            String reg = r.regNo() == null ? "" : r.regNo().trim().toUpperCase(Locale.ROOT);
            if (!roster.contains(reg)) throw ApiException.badRequest("Student " + reg + " is not in this class");
            List<Double> marks = r.marks() == null ? List.of() : r.marks();
            if (marks.size() != comp.items().size()) {
                throw ApiException.badRequest(comp.title() + " needs " + comp.items().size() + " values per student");
            }
            List<Double> clean = new ArrayList<>();
            for (int i = 0; i < marks.size(); i++) {
                Double v = marks.get(i);
                Item it = comp.items().get(i);
                if (v != null && (v.isNaN() || v < 0 || v > it.max()
                        || ("EXIT_SURVEY".equals(comp.key()) && (v < 1 || v != Math.floor(v))))) {
                    throw ApiException.badRequest(reg + " " + it.label() + ": "
                            + ("EXIT_SURVEY".equals(comp.key()) ? "rating 1 to 5" : "0 to " + fmt(it.max())));
                }
                clean.add(v);
            }
            db.sql("""
                            INSERT INTO co_entries (dept_key, semester, subject_code, component, reg_no, marks, updated_by)
                            VALUES (?, ?, ?, ?, ?, CAST(? AS JSONB), ?)
                            ON CONFLICT (dept_key, semester, subject_code, component, reg_no) DO UPDATE SET
                                marks = EXCLUDED.marks, updated_by = EXCLUDED.updated_by, updated_at = now()
                            """).params(s.dept, s.sem, s.code, comp.key(), reg, json.writeValueAsString(clean),
                            user.name()).update();
            saved++;
        }
        audit.record(user.username(), user.name(), "SAVED_CO_MARKS", s.code + " " + comp.key(),
                "Saved " + comp.title() + " marks of " + saved + " students (" + s.code + ", " + Semesters.label(s.sem)
                        + ").", ip);
        return saved;
    }

    // ----------------------------------------------------------------------------- the students' exit survey

    /** One subject of the student's semester with the student's ratings (1-5) of CO1-CO6, null when not given yet. */
    public record SurveySubject(String subjectCode, String subjectTitle, List<Double> ratings, SurveyWindow window) {
    }

    /** When students may answer a subject's exit survey; open = now is inside the window. */
    public record SurveyWindow(java.time.OffsetDateTime opensAt, java.time.OffsetDateTime closesAt, String setBy, boolean open) {
    }

    private SurveyWindow window(Subject s) {
        return db.sql("""
                        SELECT opens_at, closes_at, set_by, now() BETWEEN opens_at AND closes_at AS open
                        FROM exit_survey_windows WHERE dept_key = ? AND semester = ? AND subject_code = ?
                        """).params(s.dept, s.sem, s.code)
                .query((rs, n) -> new SurveyWindow(rs.getObject(1, java.time.OffsetDateTime.class),
                        rs.getObject(2, java.time.OffsetDateTime.class), rs.getString(3), rs.getBoolean(4)))
                .optional().orElse(null);
    }

    public record WindowRequest(String semester, String subjectCode, java.time.OffsetDateTime opensAt,
                                java.time.OffsetDateTime closesAt) {
    }

    /** The subject's faculty or HOD opens the exit survey to students for a period (closesAt null: closes it now). */
    @Transactional
    public SurveyWindow setWindow(String dept, WindowRequest r, CurrentUser user, String ip) {
        if (r == null) throw ApiException.badRequest("Choose the survey period");
        Subject s = subject(dept, r.semester(), r.subjectCode());
        if (r.opensAt() == null || r.closesAt() == null || !r.closesAt().isAfter(r.opensAt())) {
            throw ApiException.badRequest("The survey must close after it opens");
        }
        if (r.closesAt().isAfter(r.opensAt().plusDays(60))) {
            throw ApiException.badRequest("A survey period can be at most 60 days");
        }
        db.sql("""
                        INSERT INTO exit_survey_windows (dept_key, semester, subject_code, opens_at, closes_at, set_by)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON CONFLICT (dept_key, semester, subject_code) DO UPDATE SET opens_at = EXCLUDED.opens_at,
                            closes_at = EXCLUDED.closes_at, set_by = EXCLUDED.set_by, updated_at = now()
                        """).params(s.dept, s.sem, s.code, r.opensAt(), r.closesAt(), user.name()).update();
        audit.record(user.username(), user.name(), "SET_EXIT_SURVEY_WINDOW", s.code,
                "Opened the course exit survey of " + s.code + " to students from " + r.opensAt() + " to " + r.closesAt() + ".", ip);
        return window(s);
    }

    public List<SurveySubject> studentSurvey(String regNo) {
        Map<String, Object> st = studentRow(regNo);
        String dept = (String) st.get("dept_key");
        int sem = ((Number) st.get("semester")).intValue();
        Map<String, List<Double>> mine = new HashMap<>();
        db.sql("SELECT subject_code, marks FROM co_entries WHERE dept_key = ? AND semester = ? AND component = 'EXIT_SURVEY' AND reg_no = ?")
                .params(dept, sem, regNo)
                .query((rs, n) -> mine.put(rs.getString(1), json.readValue(rs.getString(2), new TypeReference<List<Double>>() { })))
                .list();
        // Only the subjects whose survey the faculty has opened (and not yet closed for good) are shown
        return db.sql("""
                        SELECT j.code, j.title, w.opens_at, w.closes_at, w.set_by, now() BETWEEN w.opens_at AND w.closes_at AS open
                        FROM subjects j JOIN exit_survey_windows w
                          ON w.dept_key = j.dept_key AND w.semester = j.semester AND w.subject_code = j.code
                        WHERE j.dept_key = ? AND j.semester = ? AND w.closes_at > now() - interval '7 days'
                        ORDER BY j.code
                        """)
                .params(dept, sem)
                .query((rs, n) -> new SurveySubject(rs.getString(1), rs.getString(2), mine.get(rs.getString(1)),
                        new SurveyWindow(rs.getObject(3, java.time.OffsetDateTime.class),
                                rs.getObject(4, java.time.OffsetDateTime.class), rs.getString(5), rs.getBoolean(6))))
                .list();
    }

    /** A student rates how well each course outcome (CO1-CO6) of a subject was achieved: 1 (poor) to 5 (excellent). */
    @Transactional
    public SurveySubject saveStudentSurvey(String regNo, String subjectCode, List<Double> ratings, String ip) {
        Map<String, Object> st = studentRow(regNo);
        String dept = (String) st.get("dept_key");
        int sem = ((Number) st.get("semester")).intValue();
        Subject s = subject(dept, Semesters.label(sem), subjectCode);
        SurveyWindow w = window(s);
        if (w == null || !w.open()) {
            throw ApiException.conflict("The exit survey of " + s.code + " is not open now");
        }
        if (ratings == null || ratings.size() != 6 || ratings.stream().anyMatch(v -> v == null || v < 1 || v > 5 || v != Math.floor(v))) {
            throw ApiException.badRequest("Rate every course outcome from 1 to 5");
        }
        db.sql("""
                        INSERT INTO co_entries (dept_key, semester, subject_code, component, reg_no, marks, updated_by)
                        VALUES (?, ?, ?, 'EXIT_SURVEY', ?, CAST(? AS JSONB), ?)
                        ON CONFLICT (dept_key, semester, subject_code, component, reg_no) DO UPDATE SET
                            marks = EXCLUDED.marks, updated_by = EXCLUDED.updated_by, updated_at = now()
                        """).params(s.dept, s.sem, s.code, regNo, json.writeValueAsString(ratings), "Student " + regNo).update();
        audit.record(regNo, (String) st.get("name"), "SUBMITTED_EXIT_SURVEY", s.code,
                "Submitted the course exit survey for " + s.code + ".", ip);
        return new SurveySubject(s.code, s.title, ratings, w);
    }

    private Map<String, Object> studentRow(String regNo) {
        return db.sql("SELECT reg_no, name, dept_key, semester FROM students WHERE reg_no = ?").param(regNo)
                .query((rs, n) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("dept_key", rs.getString("dept_key"));
                    m.put("semester", rs.getInt("semester"));
                    m.put("name", rs.getString("name"));
                    return m;
                }).optional().orElseThrow(() -> ApiException.notFound("Student not found"));
    }

    // ------------------------------------------------------------------------------------------- the attainment

    public record StudentAttainment(String regNo, String name, Map<String, Double> iat, Map<String, Double> assignment,
                                    Map<String, Double> quizOrLab, Double activity, Map<String, Double> total,
                                    String grade, Double gradePoint, Double seePercent, List<Double> survey) {
    }

    public record Level(int students, int above, Double percent, int level) {
    }

    public record SurveyRow(String co, int excellent, int veryGood, int good, int satisfactory, int poor, int total,
                            int excellentOrVeryGood, Double percent, int level) {
    }

    public record OverallRow(String co, int iat, int see, double direct, double directNinety, int exit,
                             double exitTen, double total, double percent) {
    }

    public record Attainment(String deptKey, String deptName, String semester, String subjectCode, String subjectTitle,
                             String courseType, List<StudentAttainment> students, Map<String, Level> internal,
                             Map<String, Level> university, List<SurveyRow> survey, List<OverallRow> overall) {
    }

    public Attainment attainment(String dept, String semester, String subject, String courseType) {
        Subject s = subject(dept, semester, subject);
        String stored = storedType(s);
        String type = stored != null ? stored : courseType == null || courseType.isBlank() ? guessType(s.code)
                : courseType(courseType);
        Map<String, Map<String, List<Double>>> e = entries(s);
        Map<String, List<Double>> iat1 = iatMarks(s, "IAT-1"), iat2 = iatMarks(s, "IAT-2");
        Map<String, String> grades = new HashMap<>();
        db.sql("""
                        SELECT reg_no, grade FROM marks WHERE dept_key = ? AND semester = ? AND subject_code = ?
                          AND assessment_type = 'End Semester'
                        """).params(s.dept, s.sem, s.code)
                .query((rs, n) -> grades.put(rs.getString("reg_no"), rs.getString("grade"))).list();

        List<StudentAttainment> rows = new ArrayList<>();
        for (String[] st : students(s)) {
            String reg = st[0];
            List<Double> a = iat1.get(reg), b = iat2.get(reg);
            double[] iatScored = {
                    sum(a, 0, 4) + sum(a, 10, 14),                      // CO1: Q1-4, 11a,11b,12a,12b
                    sum(a, 4, 8) + sum(a, 14, 18),                      // CO2: Q5-8, 13a,13b,14a,14b
                    sum(a, 8, 10) + sum(b, 0, 2) + sum(a, 18, 20) + sum(b, 10, 12), // CO3
                    sum(b, 2, 6) + sum(b, 12, 16),                      // CO4: Q3-6, 12a,12b,13a,13b
                    sum(b, 6, 10) + sum(b, 16, 20),                     // CO5: Q7-10, 14a,14b,15a,15b
                    sum(a, 20, 22) + sum(b, 20, 22)};                   // CO6: 16a,16b of both
            Map<String, Double> iat = new LinkedHashMap<>();
            for (int i = 0; i < 6; i++) iat.put(COS.get(i), iatScored[i] / IAT_CO_MAX[i] * 100);

            List<Double> a1 = mark(e, "ASSIGN1", reg), a2 = mark(e, "ASSIGN2", reg);
            Map<String, Double> assignment = new LinkedHashMap<>();
            assignment.put("CO1", (sum(a1, 0, 2)) / 20 * 100);
            assignment.put("CO2", (sum(a1, 2, 4)) / 20 * 100);
            assignment.put("CO3", (sum(a1, 4, 5) + sum(a2, 0, 1)) / 20 * 100);
            assignment.put("CO4", (sum(a2, 1, 3)) / 20 * 100);
            assignment.put("CO5", (sum(a2, 3, 5)) / 20 * 100);

            Map<String, Double> third = new LinkedHashMap<>();
            if ("INTEGRATED".equals(type)) {
                List<Double> p = mark(e, "PRACTICAL", reg);
                for (int i = 0; i < 5; i++) third.put(COS.get(i), sum(p, i * 2, i * 2 + 2) / 20 * 100);
            } else {
                List<Double> q1 = mark(e, "QUIZ1", reg), q2 = mark(e, "QUIZ2", reg);
                third.put("CO1", sum(q1, 0, 10) / 10 * 100);
                third.put("CO2", sum(q1, 10, 20) / 10 * 100);
                third.put("CO3", (sum(q1, 20, 25) + sum(q2, 0, 5)) / 10 * 100);
                third.put("CO4", sum(q2, 5, 15) / 10 * 100);
                third.put("CO5", sum(q2, 15, 25) / 10 * 100);
            }
            double activity = sum(mark(e, "ACTIVITY", reg), 0, 5) / 250 * 100;

            Map<String, Double> total = new LinkedHashMap<>();
            for (int i = 0; i < 5; i++) {
                String co = COS.get(i);
                total.put(co, "INTEGRATED".equals(type) ? (iat.get(co) + third.get(co)) / 2
                        : (iat.get(co) + assignment.get(co) + third.get(co)) / 3);
            }
            total.put("CO6", (iat.get("CO6") + activity) / 2);

            String grade = grades.get(reg);
            double gp = gradePoint(grade);
            double see = (gp / 6) / (10.0 / 6) * 100;
            rows.add(new StudentAttainment(reg, st[1], iat, assignment, third, activity, total, grade, gp, see,
                    mark(e, "EXIT_SURVEY", reg)));
        }

        Map<String, Level> internal = new LinkedHashMap<>(), university = new LinkedHashMap<>();
        for (String co : COS) {
            int n = rows.size();
            int above = (int) rows.stream().filter(r -> r.total().get(co) >= 50).count();
            Double pct = n == 0 ? null : (double) above / n * 100;
            internal.put(co, new Level(n, above, pct, level(pct, 60, 40, 30, 0)));
            int seeAbove = (int) rows.stream().filter(r -> r.seePercent() >= 50).count();
            Double seePct = n == 0 ? null : (double) seeAbove / n * 100;
            university.put(co, new Level(n, seeAbove, seePct, level(seePct, 60, 40, 30, 1)));
        }

        List<SurveyRow> survey = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            int[] c = new int[6];
            for (StudentAttainment r : rows) {
                Double v = r.survey() == null ? null : r.survey().get(i);
                if (v != null && v >= 1 && v <= 5) c[(int) Math.round(v)]++;
            }
            int sumAll = c[5] + c[4] + c[3] + c[2] + c[1], good = c[5] + c[4];
            Double pct = sumAll == 0 ? null : (double) good / sumAll * 100;
            survey.add(new SurveyRow(COS.get(i), c[5], c[4], c[3], c[2], c[1], sumAll, good, pct,
                    level(pct, 80, 70, 60, 0)));
        }

        List<OverallRow> overall = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            String co = COS.get(i);
            int iatLevel = internal.get(co).level(), seeLevel = university.get(co).level(), exit = survey.get(i).level();
            double direct = 0.5 * seeLevel + 0.5 * iatLevel, b = direct * 0.9, d = exit * 0.1, total = d + b;
            overall.add(new OverallRow(co, iatLevel, seeLevel, direct, b, exit, d, total, total / 3 * 100));
        }
        return new Attainment(s.dept, departments.name(s.dept), Semesters.label(s.sem), s.code, s.title, type, rows,
                internal, university, survey, overall);
    }

    /** The workbook's level rule: IF(%>t3,3,IF(%>t2,2,IF(%>t1,1,fallback))). */
    static int level(Double pct, double t3, double t2, double t1, int fallback) {
        if (pct == null) return fallback;
        return pct > t3 ? 3 : pct > t2 ? 2 : pct > t1 ? 1 : fallback;
    }

    /** The workbook's grade table: S 10, A+ 9, A 8, B+ 7, B 6, C 5, U 0, anything else 0. */
    static double gradePoint(String grade) {
        if (grade == null) return 0;
        return switch (grade.trim()) {
            case "S" -> 10;
            case "A+" -> 9;
            case "A" -> 8;
            case "B+" -> 7;
            case "B" -> 6;
            case "C" -> 5;
            default -> 0;
        };
    }

    // ---------------------------------------------------------------------------------------------- data access

    private record Subject(String dept, int sem, String code, String title) {
    }

    private Subject subject(String dept, String semester, String subject) {
        String deptKey = departments.key(dept);
        int sem = Semesters.parse(semester);
        String code = subject == null ? "" : subject.trim().toUpperCase(Locale.ROOT);
        String title = db.sql("SELECT title FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?")
                .params(deptKey, sem, code).query(String.class).optional()
                .orElseThrow(() -> ApiException.badRequest("Subject " + code + " is not in this department and semester"));
        return new Subject(deptKey, sem, code, title);
    }

    private List<String[]> students(Subject s) {
        return db.sql("SELECT reg_no, name FROM students WHERE dept_key = ? AND semester = ? ORDER BY (category = 'lateral'), reg_no")
                .params(s.dept, s.sem).query((rs, n) -> new String[] {rs.getString(1), rs.getString(2)}).list();
    }

    private String storedType(Subject s) {
        return db.sql("SELECT course_type FROM co_course_types WHERE dept_key = ? AND semester = ? AND subject_code = ?")
                .params(s.dept, s.sem, s.code).query(String.class).optional().orElse(null);
    }

    /** Subject codes end in T (theory), I (integrated) or P (practical). */
    static String guessType(String code) {
        return code.endsWith("I") ? "INTEGRATED" : "THEORY";
    }

    private Map<String, Map<String, List<Double>>> entries(Subject s) {
        Map<String, Map<String, List<Double>>> out = new HashMap<>();
        db.sql("SELECT component, reg_no, marks FROM co_entries WHERE dept_key = ? AND semester = ? AND subject_code = ?")
                .params(s.dept, s.sem, s.code)
                .query((rs, n) -> out.computeIfAbsent(rs.getString(1), k -> new HashMap<>())
                        .put(rs.getString(2), json.readValue(rs.getString(3), new TypeReference<List<Double>>() { })))
                .list();
        return out;
    }

    /**
     * The IAT marks of every student in the workbook's 22 columns (Q1-10, 11a, 11b ... 16a, 16b), from the
     * answer-script mark entry: each choice is the sum of its subdivisions (i, ii, iii).
     */
    private Map<String, List<Double>> iatMarks(Subject s, String cycle) {
        Map<String, List<Double>> out = new HashMap<>();
        db.sql("""
                        SELECT reg_no, part_a, part_bc FROM marks
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND assessment_type = ?
                        """).params(s.dept, s.sem, s.code, cycle)
                .query((rs, n) -> {
                    // part_a: Q1-10; part_bc: per question 11-16 six values, (a)(i-iii) then (b)(i-iii)
                    double[] partA = doubles(rs.getArray("part_a")), bc = doubles(rs.getArray("part_bc"));
                    List<Double> cols = new ArrayList<>();
                    for (int i = 0; i < 10; i++) cols.add(i < partA.length ? partA[i] : 0.0);
                    // A question is answered as (a) OR (b): only the better choice counts (as in grading), capped at
                    // the question's maximum (13, Q16 15), so a mistaken second choice is not added to the CO
                    for (int q = 0; q < 6; q++) {
                        double a = at(bc, q * 6) + at(bc, q * 6 + 1) + at(bc, q * 6 + 2);
                        double b = at(bc, q * 6 + 3) + at(bc, q * 6 + 4) + at(bc, q * 6 + 5);
                        double max = q == 5 ? 15 : 13;
                        cols.add(a >= b ? Math.min(a, max) : 0.0);
                        cols.add(a >= b ? 0.0 : Math.min(b, max));
                    }
                    return out.put(rs.getString("reg_no"), cols);
                }).list();
        return out;
    }

    private static double[] doubles(java.sql.Array array) throws java.sql.SQLException {
        if (array == null) return new double[0];
        Object[] v = (Object[]) array.getArray();
        double[] d = new double[v.length];
        for (int i = 0; i < v.length; i++) d[i] = v[i] == null ? 0 : ((Number) v[i]).doubleValue();
        return d;
    }

    private static double at(double[] a, int i) {
        return i < a.length ? a[i] : 0;
    }

    private static List<Double> mark(Map<String, Map<String, List<Double>>> e, String comp, String reg) {
        return e.getOrDefault(comp, Map.of()).get(reg);
    }

    private static double sum(List<Double> v, int from, int to) {
        if (v == null) return 0;
        double t = 0;
        for (int i = from; i < to && i < v.size(); i++) if (v.get(i) != null) t += v.get(i);
        return t;
    }

    private static String cycle(String c) {
        String v = c == null ? "" : c.trim().toUpperCase(Locale.ROOT).replace(" ", "");
        if (v.equals("IAT-1") || v.equals("IAT1")) return "IAT-1";
        if (v.equals("IAT-2") || v.equals("IAT2")) return "IAT-2";
        throw ApiException.badRequest("Choose IAT-1 or IAT-2");
    }

    private static String courseType(String t) {
        String v = t == null ? "" : t.trim().toUpperCase(Locale.ROOT);
        if (!v.equals("THEORY") && !v.equals("INTEGRATED")) throw ApiException.badRequest("Choose Theory or Integrated");
        return v;
    }

    private static String fmt(double d) {
        return d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
    }
}
