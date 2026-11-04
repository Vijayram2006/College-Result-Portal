package edu.kvell.results.allotments;

import edu.kvell.results.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Paper-correction allotment (see the service): the COE allots (/api/admin), the Associate Dean follows the progress
 * (/api/dean, read-only) and each faculty member sees their own bundles (/api/faculty). The path prefixes carry the
 * role checks (SecurityConfig).
 */
@RestController
public class PaperAllotmentController {

    private final PaperAllotmentService allotments;

    public PaperAllotmentController(PaperAllotmentService allotments) {
        this.allotments = allotments;
    }

    @GetMapping("/api/admin/paper-allotments/evaluators")
    List<PaperAllotmentService.Evaluator> evaluators() {
        return allotments.evaluators();
    }

    @GetMapping("/api/admin/paper-allotments")
    List<PaperAllotmentService.SubjectAllotment> list(@RequestParam String dept, @RequestParam String semester,
                                                      @RequestParam String assessment) {
        return allotments.list(dept, semester, assessment);
    }

    @PutMapping("/api/admin/paper-allotments")
    PaperAllotmentService.SubjectAllotment allot(@RequestBody PaperAllotmentService.AllotRequest req,
                                                 HttpServletRequest http) {
        return allotments.allot(req, CurrentUser.get(), http.getRemoteAddr());
    }

    @DeleteMapping("/api/admin/paper-allotments")
    Map<String, String> cancel(@RequestParam String dept, @RequestParam String semester, @RequestParam String subject,
                               @RequestParam String assessment, HttpServletRequest http) {
        allotments.cancel(dept, semester, subject, assessment, CurrentUser.get(), http.getRemoteAddr());
        return Map.of("status", "cancelled");
    }

    @GetMapping("/api/dean/paper-allotments")
    List<PaperAllotmentService.SubjectAllotment> deanList(@RequestParam String dept, @RequestParam String semester,
                                                          @RequestParam String assessment) {
        return allotments.list(dept, semester, assessment);
    }

    @GetMapping("/api/faculty/paper-allotments")
    List<PaperAllotmentService.MyBundle> mine() {
        return allotments.mine(CurrentUser.get());
    }
}
