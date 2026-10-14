package edu.kvell.results.student;

import edu.kvell.results.auth.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/student")
public class StudentController {

    private final StudentResultService results;

    public StudentController(StudentResultService results) {
        this.results = results;
    }

    /** The register number comes from the session, never from the request, so students only see their own results. */
    @GetMapping("/me/results")
    StudentResultService.StudentResults myResults() {
        return results.resultsFor(CurrentUser.get().regNo());
    }

    /** COE-finalized subjects of the student's own department and semester. */
    @GetMapping("/me/subjects")
    java.util.List<StudentResultService.RegisteredSubject> mySubjects() {
        return results.subjectsFor(CurrentUser.get().regNo());
    }
}
