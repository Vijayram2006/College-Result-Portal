package edu.kvell.results.admin;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ResultBatchService results;
    private final AuditService audit;

    public AdminController(ResultBatchService results, AuditService audit) {
        this.results = results;
        this.audit = audit;
    }

    @GetMapping("/dashboard")
    ResultBatchService.DashboardStats dashboard() {
        return results.dashboard();
    }

    @GetMapping("/results")
    List<ResultBatchService.ResultBatch> batches() {
        return results.list();
    }

    /** Publishes every subject of a department and semester together (only when all marks are entered). */
    @PostMapping("/publish")
    ResultBatchService.PublishSummary publishDepartment(@RequestBody ResultBatchService.PublishRequest request,
                                                        HttpServletRequest http) {
        return results.publishDepartment(request, CurrentUser.get(), http.getRemoteAddr());
    }

    /** Withdraws every published subject of a department and semester (with a reason); marks are kept. */
    @PostMapping("/publish/withdraw")
    Map<String, Integer> withdrawDepartment(@RequestBody ResultBatchService.PublishRequest request,
                                            HttpServletRequest http) {
        return Map.of("withdrawn", results.unpublishDepartment(request, CurrentUser.get(), http.getRemoteAddr()));
    }

    /** Older name of /publish/withdraw, kept for the deprecation period. */
    @PostMapping("/publish/unpublish")
    Map<String, Integer> unpublishDepartment(@RequestBody ResultBatchService.PublishRequest request,
                                             HttpServletRequest http) {
        return Map.of("unpublished", results.unpublishDepartment(request, CurrentUser.get(), http.getRemoteAddr()));
    }

    @DeleteMapping("/results/all")
    Map<String, Integer> deleteAll(HttpServletRequest http) {
        return Map.of("deleted", results.deleteAll(CurrentUser.get(), http.getRemoteAddr()));
    }

    @DeleteMapping("/results/{id}")
    ResponseEntity<Void> delete(@PathVariable String id, HttpServletRequest http) {
        results.delete(id, CurrentUser.get(), http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/results")
    Map<String, Integer> deleteForSemester(@RequestParam String dept, @RequestParam String semester,
                                           @RequestParam(required = false) String subject,
                                           HttpServletRequest http) {
        return Map.of("deleted",
                results.deleteForSemester(dept, semester, subject, CurrentUser.get(), http.getRemoteAddr()));
    }

    /** "Approve & Publish" on a forwarded subject: publishes its whole department and semester. */
    @PostMapping("/results/{id}/publish")
    ResultBatchService.PublishSummary publishBatch(@PathVariable String id, HttpServletRequest http) {
        return results.publishBatch(id, CurrentUser.get(), http.getRemoteAddr());
    }

    /** The COE can also forward a subject it marked itself in Mark Entry. */
    @PostMapping("/forward")
    ResultBatchService.ResultBatch forward(@RequestBody ResultBatchService.ForwardRequest request,
                                           HttpServletRequest http) {
        return results.forward(request, CurrentUser.get(), http.getRemoteAddr());
    }

    /** Publish Results page: every subject of a department and semester with its publication state. */
    @GetMapping("/publish/status")
    List<ResultBatchService.PublishRow> publishStatus(@RequestParam String dept, @RequestParam String semester,
                                                      @RequestParam String assessment) {
        return results.publishStatus(dept, semester, assessment);
    }

    @GetMapping("/audit-logs")
    List<AuditService.AuditLogRecord> auditLogs() {
        return audit.latest(200);
    }
}
