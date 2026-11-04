package edu.kvell.results.faculty;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Which subjects a faculty member may work on:
 * <ul>
 *   <li>Mark entry and the CO sheet: the subjects the Associate Dean assigned them (their handling subjects). An
 *       account without assigned subjects (the shared demo logins) keeps its whole department. The HOD has the whole
 *       department.</li>
 *   <li>Paper correction: the subjects whose answer scripts the COE allotted to them, in any department of the
 *       college (an ECE paper can be allotted to a CSE faculty member). An allotted evaluator sees and marks only
 *       their own bundle of the subject's scripts; once a subject's assessment is allotted, only its evaluators may
 *       mark it.</li>
 * </ul>
 */
@Service
public class FacultyAccess {

    private final JdbcClient db;
    private final Departments departments;

    public FacultyAccess(JdbcClient db, Departments departments) {
        this.db = db;
        this.departments = departments;
    }

    /** The handling subjects of an account, as "dept|semester|code"; empty = no restriction. */
    public List<String> handling(long userId) {
        return db.sql("SELECT dept_key || '|' || semester || '|' || subject_code FROM faculty_subjects WHERE user_id = ?")
                .param(userId).query(String.class).list();
    }

    /**
     * The department of a subject the signed-in faculty member may mark: their own department's handling subjects,
     * or any subject the COE allotted to them for paper correction. dept is the requested department (blank = own).
     */
    public String deptFor(String dept, String semester, String subject) {
        CurrentUser user = CurrentUser.get();
        String own = user.deptKey();
        String code = subject == null ? "" : subject.trim().toUpperCase(Locale.ROOT);
        String wanted = dept == null || dept.isBlank() ? own : departments.key(dept);
        if (allotted(user.username(), code, wanted)) return wanted;
        if (!wanted.equals(own)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This subject was not allotted to you for paper correction");
        }
        if (user.role() == CurrentUser.Role.FACULTY) {
            List<String> mine = handling(user.id());
            if (!mine.isEmpty() && !mine.contains(own + "|" + Semesters.parse(semester) + "|" + code)) {
                throw new ApiException(HttpStatus.FORBIDDEN, code + " is not one of your handling subjects");
            }
        }
        return own;
    }

    /** True when the COE's paper-correction allotment lists this account as an evaluator of the subject. */
    public boolean allotted(String username, String code, String dept) {
        return db.sql("""
                        SELECT count(*) FROM paper_allotments p JOIN users u ON u.id = p.evaluator_id
                        WHERE p.subject_code = ? AND p.dept_key = ? AND upper(u.username) = upper(?)
                        """)
                .params(code, dept, username).query(Integer.class).single() > 0;
    }

    /**
     * The part of a subject's evaluation order the signed-in faculty member may see and mark: their own bundle when
     * the COE allotted the subject's assessment (nothing if it went to other evaluators), otherwise all of it.
     */
    /** Forwarding another department's subject: only an assessment the COE allotted to this evaluator. */
    public void requireAllottedAssessment(String dept, String semester, String subject, String assessment) {
        CurrentUser user = CurrentUser.get();
        if (dept.equals(user.deptKey())) return;
        int n = db.sql("""
                        SELECT count(*) FROM paper_allotments WHERE evaluator_id = ? AND dept_key = ? AND semester = ?
                          AND subject_code = ? AND assessment_type = ?
                        """).params(user.id(), dept, Semesters.parse(semester), subject.trim().toUpperCase(Locale.ROOT),
                        assessment == null ? "" : assessment.trim()).query(Integer.class).single();
        if (n == 0) throw new ApiException(HttpStatus.FORBIDDEN, "This assessment was not allotted to you for paper correction");
    }

    public <T> List<T> bundle(List<T> order, String dept, String semester, String subject, String assessment) {
        CurrentUser user = CurrentUser.get();
        if (user.role() != CurrentUser.Role.FACULTY) return order;
        int sem = Semesters.parse(semester);
        String code = subject.trim().toUpperCase(Locale.ROOT);
        String a = assessment.trim();
        List<int[]> ranges = db.sql("""
                        SELECT first_script, last_script, evaluator_id FROM paper_allotments
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND assessment_type = ?
                        """).params(dept, sem, code, a)
                .query((rs, n) -> new int[] {rs.getInt(1), rs.getInt(2), rs.getLong(3) == user.id() ? 1 : 0}).list();
        // Another department's subject is reachable only through an allotment of this very assessment (an IAT-1
        // allotment does not open the subject's IAT-2 or End Semester scripts)
        if (ranges.isEmpty() && !dept.equals(user.deptKey())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "The " + code + " " + a + " scripts were not allotted to you");
        }
        if (ranges.isEmpty()) return order;
        int[] mine = ranges.stream().filter(r -> r[2] == 1).findFirst().orElseThrow(() -> new ApiException(
                HttpStatus.FORBIDDEN, "The COE allotted the " + code + " " + a + " scripts to other evaluators"));
        int last = Math.min(mine[1], order.size());
        return mine[0] > last ? List.of() : order.subList(mine[0] - 1, last);
    }
}
