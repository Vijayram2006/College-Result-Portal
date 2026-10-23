package edu.kvell.results.coassessment;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * Online technical quizzes (R2026 CO sheet: Quiz 1 in the IAT-1 cycle, Quiz II in IAT-2, 25 one-mark questions each).
 * The subject's faculty writes the 25 multiple-choice questions and opens the quiz to the students for a period; a
 * student answers once, and their per-question score (1 or 0) fills the CO sheet's quiz column automatically, with
 * each question's CO fixed by its position as in the workbook.
 */
@Service
public class QuizService {

    public static final int QUESTIONS = 25;

    /** answer is the index (0-3) of the correct option; hidden from students. */
    public record Question(String q, List<String> options, Integer answer, String co) {
    }

    public record Quiz(long id, String semester, String subjectCode, String subjectTitle, String cycle, String title,
                       List<Question> questions, OffsetDateTime opensAt, OffsetDateTime closesAt, boolean open,
                       String createdBy, int attempts, Integer myScore) {
    }

    public record QuizInput(String semester, String subjectCode, String cycle, String title, List<Question> questions,
                            OffsetDateTime opensAt, OffsetDateTime closesAt) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final ObjectMapper json;

    public QuizService(JdbcClient db, Departments departments, AuditService audit, ObjectMapper json) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
        this.json = json;
    }

    private static String component(String cycle) {
        return "IAT-2".equals(cycle) ? "QUIZ2" : "QUIZ1";
    }

    private static String cycle(String c) {
        String v = c == null ? "" : c.trim().toUpperCase(Locale.ROOT);
        if (!v.equals("IAT-1") && !v.equals("IAT-2")) throw ApiException.badRequest("Choose IAT-1 or IAT-2");
        return v;
    }

    /** The subject's quizzes with the answers (faculty / HOD of the department). */
    public List<Quiz> forSubject(String dept, String semester, String subject) {
        String d = departments.key(dept);
        int sem = Semesters.parse(semester);
        String code = subject == null ? "" : subject.trim().toUpperCase(Locale.ROOT);
        return db.sql("""
                        SELECT q.*, j.title AS subject_title, now() BETWEEN q.opens_at AND q.closes_at AS open,
                               (SELECT count(*) FROM quiz_attempts a WHERE a.quiz_id = q.id) AS attempts
                        FROM quizzes q JOIN subjects j ON j.dept_key = q.dept_key AND j.semester = q.semester AND j.code = q.subject_code
                        WHERE q.dept_key = ? AND q.semester = ? AND q.subject_code = ? ORDER BY q.cycle
                        """).params(d, sem, code)
                .query((rs, n) -> new Quiz(rs.getLong("id"), Semesters.label(rs.getInt("semester")),
                        rs.getString("subject_code"), rs.getString("subject_title"), rs.getString("cycle"),
                        rs.getString("title"), questions(rs.getString("questions")),
                        rs.getObject("opens_at", OffsetDateTime.class), rs.getObject("closes_at", OffsetDateTime.class),
                        rs.getBoolean("open"), rs.getString("created_by"), rs.getInt("attempts"), null))
                .list();
    }

    @Transactional
    public Quiz save(String dept, QuizInput in, CurrentUser user, String ip) {
        if (in == null) throw ApiException.badRequest("Quiz details are required");
        String d = departments.key(dept);
        int sem = Semesters.parse(in.semester());
        String code = in.subjectCode() == null ? "" : in.subjectCode().trim().toUpperCase(Locale.ROOT);
        if (db.sql("SELECT count(*) FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?")
                .params(d, sem, code).query(Integer.class).single() == 0) {
            throw ApiException.badRequest("Subject " + code + " is not in this department and semester");
        }
        String c = cycle(in.cycle());
        String title = in.title() == null || in.title().isBlank() ? (c.equals("IAT-1") ? "Technical Quiz 1" : "Technical Quiz II")
                : in.title().trim();
        if (title.length() > 160) throw ApiException.badRequest("Title is too long");
        if (in.opensAt() == null || in.closesAt() == null || !in.closesAt().isAfter(in.opensAt())) {
            throw ApiException.badRequest("The quiz must close after it opens");
        }
        if (in.closesAt().isAfter(in.opensAt().plusDays(30))) throw ApiException.badRequest("A quiz can be open at most 30 days");
        List<Question> qs = in.questions();
        if (qs == null || qs.size() != QUESTIONS) throw ApiException.badRequest("A quiz has exactly " + QUESTIONS + " questions");
        List<CoAssessmentService.Item> items = CoAssessmentService.COMPONENTS.get(component(c)).items();
        List<Question> clean = new ArrayList<>();
        for (int i = 0; i < qs.size(); i++) {
            Question q = qs.get(i);
            if (q == null || q.q() == null || q.q().isBlank()) throw ApiException.badRequest("Question " + (i + 1) + " is empty");
            if (q.options() == null || q.options().size() != 4 || q.options().stream().anyMatch(o -> o == null || o.isBlank())) {
                throw ApiException.badRequest("Question " + (i + 1) + " needs four options");
            }
            if (q.answer() == null || q.answer() < 0 || q.answer() > 3) {
                throw ApiException.badRequest("Choose the correct option of question " + (i + 1));
            }
            if (q.q().length() > 1000 || q.options().stream().anyMatch(o -> o.length() > 300)) {
                throw ApiException.badRequest("Question " + (i + 1) + " is too long");
            }
            clean.add(new Question(q.q().trim(), q.options().stream().map(String::trim).toList(), q.answer(), items.get(i).co()));
        }
        String text = json.writeValueAsString(clean);
        var existing = db.sql("""
                        SELECT q.id, q.questions::text, (SELECT count(*) FROM quiz_attempts a WHERE a.quiz_id = q.id)
                        FROM quizzes q WHERE dept_key = ? AND semester = ? AND subject_code = ? AND cycle = ?
                        """).params(d, sem, code, c)
                .query((rs, n) -> new Object[] {rs.getLong(1), rs.getString(2), rs.getInt(3)}).optional();
        if (existing.isPresent() && (int) existing.get()[2] > 0
                && !json.readTree((String) existing.get()[1]).equals(json.readTree(text))) {
            throw ApiException.conflict("Students have already answered this quiz; only its period can change");
        }
        db.sql("""
                        INSERT INTO quizzes (dept_key, semester, subject_code, cycle, title, questions, opens_at, closes_at, created_by)
                        VALUES (?, ?, ?, ?, ?, CAST(? AS JSONB), ?, ?, ?)
                        ON CONFLICT (dept_key, semester, subject_code, cycle) DO UPDATE SET title = EXCLUDED.title,
                            questions = EXCLUDED.questions, opens_at = EXCLUDED.opens_at, closes_at = EXCLUDED.closes_at,
                            created_by = EXCLUDED.created_by, updated_at = now()
                        """).params(d, sem, code, c, title, text, in.opensAt(), in.closesAt(), user.name()).update();
        audit.record(user.username(), user.name(), "SAVED_QUIZ", code + " " + c,
                "Saved the " + c + " quiz of " + code + ", open to students from " + in.opensAt() + " to " + in.closesAt() + ".", ip);
        return forSubject(d, Semesters.label(sem), code).stream().filter(x -> x.cycle().equals(c)).findFirst().orElseThrow();
    }

    /** The student's quizzes (open now or closed within a week), without the answers. */
    public List<Quiz> forStudent(String regNo) {
        var st = db.sql("SELECT dept_key, semester FROM students WHERE reg_no = ?").param(regNo)
                .query((rs, n) -> new Object[] {rs.getString(1), rs.getInt(2)}).optional()
                .orElseThrow(() -> ApiException.notFound("Student not found"));
        return db.sql("""
                        SELECT q.*, j.title AS subject_title, now() BETWEEN q.opens_at AND q.closes_at AS open,
                               (SELECT a.score FROM quiz_attempts a WHERE a.quiz_id = q.id AND a.reg_no = ?) AS my_score
                        FROM quizzes q JOIN subjects j ON j.dept_key = q.dept_key AND j.semester = q.semester AND j.code = q.subject_code
                        WHERE q.dept_key = ? AND q.semester = ? AND q.opens_at <= now() + interval '7 days'
                          AND q.closes_at > now() - interval '7 days'
                        ORDER BY q.closes_at
                        """).params(regNo, st[0], st[1])
                .query((rs, n) -> {
                    int mine = rs.getInt("my_score");
                    Integer my = rs.wasNull() ? null : mine;
                    boolean open = rs.getBoolean("open");
                    // The questions are shown only while the quiz is open (never the correct options)
                    List<Question> qs = open && my == null ? questions(rs.getString("questions")).stream()
                            .map(q -> new Question(q.q(), q.options(), null, q.co())).toList() : List.of();
                    return new Quiz(rs.getLong("id"), Semesters.label(rs.getInt("semester")), rs.getString("subject_code"),
                            rs.getString("subject_title"), rs.getString("cycle"), rs.getString("title"), qs,
                            rs.getObject("opens_at", OffsetDateTime.class), rs.getObject("closes_at", OffsetDateTime.class),
                            open, rs.getString("created_by"), 0, my);
                })
                .list();
    }

    /** A student submits their answers once, while the quiz is open; the score goes into the CO sheet. */
    @Transactional
    public Quiz submit(String regNo, long quizId, List<Integer> answers, String ip) {
        var q = db.sql("""
                        SELECT q.dept_key, q.semester, q.subject_code, q.cycle, q.questions::text,
                               now() BETWEEN q.opens_at AND q.closes_at AS open, s.name
                        FROM quizzes q JOIN students s ON s.reg_no = ? AND s.dept_key = q.dept_key AND s.semester = q.semester
                        WHERE q.id = ?
                        """).params(regNo, quizId)
                .query((rs, n) -> new Object[] {rs.getString(1), rs.getInt(2), rs.getString(3), rs.getString(4),
                        rs.getString(5), rs.getBoolean(6), rs.getString(7)}).optional()
                .orElseThrow(() -> ApiException.notFound("Quiz not found"));
        if (!(boolean) q[5]) throw ApiException.conflict("This quiz is not open now");
        if (db.sql("SELECT count(*) FROM quiz_attempts WHERE quiz_id = ? AND reg_no = ?").params(quizId, regNo)
                .query(Integer.class).single() > 0) {
            throw ApiException.conflict("You have already answered this quiz");
        }
        List<Question> qs = questions((String) q[4]);
        if (answers == null || answers.size() != qs.size()) throw ApiException.badRequest("Answer all " + qs.size() + " questions");
        List<Double> marks = new ArrayList<>();
        int score = 0;
        for (int i = 0; i < qs.size(); i++) {
            Integer a = answers.get(i);
            if (a == null || a < 0 || a > 3) throw ApiException.badRequest("Answer question " + (i + 1));
            boolean right = a.equals(qs.get(i).answer());
            if (right) score++;
            marks.add(right ? 1.0 : 0.0);
        }
        db.sql("INSERT INTO quiz_attempts (quiz_id, reg_no, answers, score, total) VALUES (?, ?, CAST(? AS JSONB), ?, ?)")
                .params(quizId, regNo, json.writeValueAsString(answers), score, qs.size()).update();
        db.sql("""
                        INSERT INTO co_entries (dept_key, semester, subject_code, component, reg_no, marks, updated_by)
                        VALUES (?, ?, ?, ?, ?, CAST(? AS JSONB), ?)
                        ON CONFLICT (dept_key, semester, subject_code, component, reg_no) DO UPDATE SET
                            marks = EXCLUDED.marks, updated_by = EXCLUDED.updated_by, updated_at = now()
                        """).params(q[0], q[1], q[2], component((String) q[3]), regNo, json.writeValueAsString(marks),
                        "Online quiz").update();
        audit.record(regNo, (String) q[6], "SUBMITTED_QUIZ", q[2] + " " + q[3],
                "Answered the " + q[3] + " quiz of " + q[2] + ": " + score + "/" + qs.size() + ".", ip);
        return forStudent(regNo).stream().filter(x -> x.id() == quizId).findFirst().orElseThrow();
    }

    private List<Question> questions(String text) {
        return json.readValue(text, new TypeReference<List<Question>>() { });
    }
}
