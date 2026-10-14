package edu.kvell.results.student;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.governance.GovernanceService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student")
public class StudentController {

    private final StudentResultService results;
    private final GovernanceService governance;

    public StudentController(StudentResultService results, GovernanceService governance) {
        this.results = results;
        this.governance = governance;
    }

    /** The register number comes from the session, never from the request, so students only see their own results. */
    @GetMapping("/me/results")
    StudentResultService.StudentResults myResults() {
        CurrentUser me = CurrentUser.get();
        StudentResultService.StudentResults mine = results.resultsFor(me.regNo());
        // Results the Super Admin is withholding never leave the server
        return governance.resultsWithheld(me.collegeKey()) ? mine.withheldCopy() : mine;
    }

    /** COE-finalized subjects of the student's own department and semester. */
    @GetMapping("/me/subjects")
    java.util.List<StudentResultService.RegisteredSubject> mySubjects() {
        return results.subjectsFor(CurrentUser.get().regNo());
    }
}
