package edu.kvell.results.hod;

import edu.kvell.results.admin.ResultBatchService;
import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.marks.MarkService;
import edu.kvell.results.students.StudentAdminService;
import edu.kvell.results.subjects.SubjectService;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/hod")
public class HodController {

    /** Everything the analytics page needs, for the HOD's own department only (dates of birth left out). */
    public record Analytics(String departmentKey, String departmentName, String departmentCode,
                            List<MarkService.StudentMark> marks, List<ResultBatchService.ResultBatch> batches,
                            List<SubjectService.SubjectItem> subjects, List<StudentAdminService.StudentView> students) {
    }

    private final HodService hod;
    private final MarkService marks;
    private final ResultBatchService results;
    private final SubjectService subjects;
    private final StudentAdminService students;
    private final JdbcClient db;

    public HodController(HodService hod, MarkService marks, ResultBatchService results, SubjectService subjects,
                         StudentAdminService students, JdbcClient db) {
        this.hod = hod;
        this.marks = marks;
        this.results = results;
        this.subjects = subjects;
        this.students = students;
        this.db = db;
    }

    /** The department comes from the HOD's account, so a HOD cannot view other departments. */
    @GetMapping("/overview")
    HodService.Overview overview() {
        return hod.overview(CurrentUser.get().deptKey());
    }

    /** The department's subject catalog (for choosing a subject on the internal marks page). */
    @GetMapping("/subjects")
    List<SubjectService.SubjectItem> subjects() {
        return subjects.list(CurrentUser.get().deptKey());
    }

    /** Full result analytics of the HOD's department: every entered mark (published or not), batches, subjects. */
    @GetMapping("/analytics")
    Analytics analytics() {
        String dept = CurrentUser.get().deptKey();
        var d = db.sql("SELECT name, coalesce(code, upper(dept_key)) AS code FROM departments WHERE dept_key = ?")
                .param(dept).query().singleRow();
        List<StudentAdminService.StudentView> roster = students.list(dept, null).stream()
                .map(s -> new StudentAdminService.StudentView(s.regNo(), s.studentName(), null, s.dept(), s.deptKey(),
                        s.deptName(), s.category(), s.year(), s.semester(), s.academicYear()))
                .toList();
        return new Analytics(dept, (String) d.get("name"), (String) d.get("code"), marks.allEnteredForDepartment(dept),
                results.listForDepartment(dept), subjects.list(dept), roster);
    }
}
