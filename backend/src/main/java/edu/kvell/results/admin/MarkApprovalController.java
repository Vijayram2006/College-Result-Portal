package edu.kvell.results.admin;

import edu.kvell.results.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Forwarded marks waiting for the HOD's or the Associate Dean's approval (see MarkApprovalService). */
@RestController
public class MarkApprovalController {

    private final MarkApprovalService approvals;

    public MarkApprovalController(MarkApprovalService approvals) {
        this.approvals = approvals;
    }

    @GetMapping({"/api/hod/mark-approvals", "/api/dean/mark-approvals"})
    MarkApprovalService.Overview list() {
        return approvals.list(CurrentUser.get());
    }

    @PostMapping({"/api/hod/mark-approvals/{id}/approve", "/api/dean/mark-approvals/{id}/approve"})
    MarkApprovalService.Item approve(@PathVariable String id, HttpServletRequest http) {
        return approvals.approve(id, CurrentUser.get(), http.getRemoteAddr());
    }

    @PostMapping({"/api/hod/mark-approvals/{id}/return", "/api/dean/mark-approvals/{id}/return"})
    MarkApprovalService.Item returnToFaculty(@PathVariable String id, @RequestBody Map<String, String> body,
                                             HttpServletRequest http) {
        return approvals.returnToFaculty(id, body == null ? null : body.get("reason"), CurrentUser.get(),
                http.getRemoteAddr());
    }
}
