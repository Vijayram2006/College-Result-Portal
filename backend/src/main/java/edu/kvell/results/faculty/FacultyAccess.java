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
 *   <li>Paper correction: the subjects whose answer scripts the Dean allotted to them, in any department of the
 *       college (an ECE paper can be allotted to a CSE faculty member).</li>
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
     * or any subject the Dean allotted to them for paper correction. dept is the requested department (blank = own).
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

    /** True when the Dean's paper-correction allotment lists this account as an evaluator of the subject. */
    public boolean allotted(String username, String code, String dept) {
        return db.sql("""
                        SELECT count(*) FROM workflow_documents w,
                             jsonb_array_elements(CASE WHEN jsonb_typeof(w.data) = 'array' THEN w.data ELSE '[]' END) a,
                             jsonb_array_elements(coalesce(a -> 'assignedStaff', '[]')) s
                        WHERE w.college_key = ? AND w.doc_key = 'kvell_paper_correction_assignments'
                          AND upper(a ->> 'subjectCode') = ? AND lower(coalesce(a ->> 'deptKey', '')) IN (?, 'all')
                          AND upper(s ->> 'facultyId') = upper(?)
                        """)
                .params(departments.college(), code, dept, username).query(Integer.class).single() > 0;
    }
}
