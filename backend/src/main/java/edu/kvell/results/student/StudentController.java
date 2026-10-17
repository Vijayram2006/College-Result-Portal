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

    private final edu.kvell.results.common.ResultsCache cache;

    public StudentController(StudentResultService results, GovernanceService governance,
                             edu.kvell.results.common.ResultsCache cache) {
        this.results = results;
        this.governance = governance;
        this.cache = cache;
    }

    /** The register number comes from the session, never from the request, so students only see their own results. */
    @GetMapping("/me/results")
    StudentResultService.StudentResults myResults() {
        CurrentUser me = CurrentUser.get();
        StudentResultService.StudentResults mine = cache.get("results:" + me.regNo(), () -> results.resultsFor(me.regNo()));
        // Results the Super Admin is withholding never leave the server
        return governance.resultsWithheld(me.collegeKey()) ? mine.withheldCopy() : mine;
    }

    /** COE-finalized subjects of the student's own department and semester. */
    @GetMapping("/me/subjects")
    java.util.List<StudentResultService.RegisteredSubject> mySubjects() {
        return results.subjectsFor(CurrentUser.get().regNo());
    }
}
