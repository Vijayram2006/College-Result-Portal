package edu.kvell.results.revaluation;

import edu.kvell.results.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Students apply under /api/student (their own results only); the COE handles them under /api/admin. */
@RestController
public class RevaluationController {

    private final RevaluationService revaluation;

    public RevaluationController(RevaluationService revaluation) {
        this.revaluation = revaluation;
    }

    @PostMapping("/api/student/revaluation")
    RevaluationService.Request apply(@RequestBody RevaluationService.ApplyRequest request, HttpServletRequest http) {
        return revaluation.apply(request, CurrentUser.get(), http.getRemoteAddr());
    }

    @GetMapping("/api/student/revaluation")
    List<RevaluationService.Request> mine() {
        return revaluation.mine(CurrentUser.get());
    }

    @GetMapping("/api/admin/revaluation")
    List<RevaluationService.Request> inbox() {
        return revaluation.forCollege();
    }

    @PostMapping("/api/admin/revaluation/{id}/status")
    RevaluationService.Request setStatus(@PathVariable long id, @RequestBody RevaluationService.StatusRequest request,
                                        HttpServletRequest http) {
        return revaluation.setStatus(id, request, CurrentUser.get(), http.getRemoteAddr());
    }
}
