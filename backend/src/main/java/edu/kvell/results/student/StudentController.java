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

    private final edu.kvell.results.coassessment.CoAssessmentService survey;
    private final edu.kvell.results.coassessment.QuizService quizzes;

    public StudentController(StudentResultService results, GovernanceService governance,
                             edu.kvell.results.common.ResultsCache cache,
                             edu.kvell.results.coassessment.CoAssessmentService survey,
                             edu.kvell.results.coassessment.QuizService quizzes) {
        this.survey = survey;
        this.quizzes = quizzes;
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

    public record SurveyInput(String subjectCode, java.util.List<Double> ratings) {
    }

    public record QuizAnswers(java.util.List<Integer> answers) {
    }

    /** Online quizzes of the student's semester (questions only while open; never the correct options). */
    @GetMapping("/quizzes")
    java.util.List<edu.kvell.results.coassessment.QuizService.Quiz> quizzes() {
        return quizzes.forStudent(CurrentUser.get().regNo());
    }

    @org.springframework.web.bind.annotation.PostMapping("/quizzes/{id}")
    edu.kvell.results.coassessment.QuizService.Quiz answerQuiz(
            @org.springframework.web.bind.annotation.PathVariable long id,
            @org.springframework.web.bind.annotation.RequestBody QuizAnswers in, jakarta.servlet.http.HttpServletRequest http) {
        return quizzes.submit(CurrentUser.get().regNo(), id, in == null ? null : in.answers(), http.getRemoteAddr());
    }

    /** The course exit survey of the student's own semester (it feeds the CO attainment automatically). */
    @GetMapping("/exit-survey")
    java.util.List<edu.kvell.results.coassessment.CoAssessmentService.SurveySubject> exitSurvey() {
        return survey.studentSurvey(CurrentUser.get().regNo());
    }

    @org.springframework.web.bind.annotation.PutMapping("/exit-survey")
    edu.kvell.results.coassessment.CoAssessmentService.SurveySubject saveExitSurvey(
            @org.springframework.web.bind.annotation.RequestBody SurveyInput in, jakarta.servlet.http.HttpServletRequest http) {
        if (in == null) throw edu.kvell.results.common.ApiException.badRequest("Ratings are required");
        return survey.saveStudentSurvey(CurrentUser.get().regNo(), in.subjectCode(), in.ratings(), http.getRemoteAddr());
    }

    /** COE-finalized subjects of the student's own department and semester. */
    @GetMapping("/me/subjects")
    java.util.List<StudentResultService.RegisteredSubject> mySubjects() {
        return results.subjectsFor(CurrentUser.get().regNo());
    }
}
