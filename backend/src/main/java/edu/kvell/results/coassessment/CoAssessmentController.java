package edu.kvell.results.coassessment;

import edu.kvell.results.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * CO assessment (R2026 CO attainment sheets). Faculty and the HOD enter marks for their own department; the college
 * COE and the Associate Dean view any department of their college (read-only).
 */
@RestController
public class CoAssessmentController {

    private final CoAssessmentService co;
    private final QuizService quizzes;
    private final edu.kvell.results.faculty.FacultyAccess access;

    public CoAssessmentController(CoAssessmentService co, QuizService quizzes,
                                  edu.kvell.results.faculty.FacultyAccess access) {
        this.co = co;
        this.quizzes = quizzes;
        this.access = access;
    }

    /** The department of a subject the signed-in faculty member handles (the HOD: any subject of the department). */
    private String dept(String semester, String subject) {
        return access.deptFor(null, semester, subject);
    }

    // ---- faculty and HOD: their own department

    @GetMapping({"/api/faculty/co-assessment", "/api/hod/co-assessment"})
    CoAssessmentService.Sheet sheet(@RequestParam String semester, @RequestParam String subject,
                                    @RequestParam String cycle, @RequestParam(required = false) String courseType) {
        return co.sheet(dept(semester, subject), semester, subject, cycle, courseType);
    }

    @PutMapping({"/api/faculty/co-assessment", "/api/hod/co-assessment"})
    Map<String, Integer> save(@RequestBody CoAssessmentService.SaveRequest req, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        return Map.of("saved", co.save(dept(req.semester(), req.subjectCode()), req, user, http.getRemoteAddr()));
    }

    @PutMapping({"/api/faculty/co-assessment/survey-window", "/api/hod/co-assessment/survey-window"})
    CoAssessmentService.SurveyWindow surveyWindow(@RequestBody CoAssessmentService.WindowRequest req, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        return co.setWindow(dept(req.semester(), req.subjectCode()), req, user, http.getRemoteAddr());
    }

    // ---- online quizzes: the subject's faculty writes them and opens them to the students

    @GetMapping({"/api/faculty/quizzes", "/api/hod/quizzes"})
    java.util.List<QuizService.Quiz> quizzes(@RequestParam String semester, @RequestParam String subject) {
        return quizzes.forSubject(dept(semester, subject), semester, subject);
    }

    @PutMapping({"/api/faculty/quizzes", "/api/hod/quizzes"})
    QuizService.Quiz saveQuiz(@RequestBody QuizService.QuizInput in, HttpServletRequest http) {
        if (in == null) throw edu.kvell.results.common.ApiException.badRequest("Quiz details are required");
        return quizzes.save(dept(in.semester(), in.subjectCode()), in, CurrentUser.get(), http.getRemoteAddr());
    }

    @GetMapping({"/api/faculty/co-assessment/attainment", "/api/hod/co-assessment/attainment"})
    CoAssessmentService.Attainment attainment(@RequestParam String semester, @RequestParam String subject,
                                              @RequestParam(required = false) String courseType) {
        return co.attainment(dept(semester, subject), semester, subject, courseType);
    }

    // ---- COE and Associate Dean: any department of the college (Departments.key checks the college)

    @GetMapping("/api/admin/co-assessment")
    CoAssessmentService.Sheet adminSheet(@RequestParam String dept, @RequestParam String semester,
                                         @RequestParam String subject, @RequestParam String cycle,
                                         @RequestParam(required = false) String courseType) {
        return co.sheet(dept, semester, subject, cycle, courseType);
    }

    @GetMapping("/api/admin/co-assessment/attainment")
    CoAssessmentService.Attainment adminAttainment(@RequestParam String dept, @RequestParam String semester,
                                                   @RequestParam String subject,
                                                   @RequestParam(required = false) String courseType) {
        return co.attainment(dept, semester, subject, courseType);
    }
}
