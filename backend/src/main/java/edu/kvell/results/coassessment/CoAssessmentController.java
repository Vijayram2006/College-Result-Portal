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

    public CoAssessmentController(CoAssessmentService co) {
        this.co = co;
    }

    // ---- faculty and HOD: their own department

    @GetMapping({"/api/faculty/co-assessment", "/api/hod/co-assessment"})
    CoAssessmentService.Sheet sheet(@RequestParam String semester, @RequestParam String subject,
                                    @RequestParam String cycle, @RequestParam(required = false) String courseType) {
        return co.sheet(CurrentUser.get().deptKey(), semester, subject, cycle, courseType);
    }

    @PutMapping({"/api/faculty/co-assessment", "/api/hod/co-assessment"})
    Map<String, Integer> save(@RequestBody CoAssessmentService.SaveRequest req, HttpServletRequest http) {
        CurrentUser user = CurrentUser.get();
        return Map.of("saved", co.save(user.deptKey(), req, user, http.getRemoteAddr()));
    }

    @GetMapping({"/api/faculty/co-assessment/attainment", "/api/hod/co-assessment/attainment"})
    CoAssessmentService.Attainment attainment(@RequestParam String semester, @RequestParam String subject,
                                              @RequestParam(required = false) String courseType) {
        return co.attainment(CurrentUser.get().deptKey(), semester, subject, courseType);
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
