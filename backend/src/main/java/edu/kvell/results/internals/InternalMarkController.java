package edu.kvell.results.internals;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.Departments;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal marks for every role. Faculty enter them and the HOD corrects them, both for their own department only.
 * The college COE views every department and keeps the formula; the Chief COE only views (GovernanceFilter); a
 * student sees their own marks (when the COE shows them to students).
 */
@RestController
public class InternalMarkController {

    public record SchemeInput(InternalMarkService.Config config, boolean confirmed, boolean visibleToStudents) {
    }

    private final InternalMarkService internals;
    private final Departments departments;

    public InternalMarkController(InternalMarkService internals, Departments departments) {
        this.internals = internals;
        this.departments = departments;
    }

    // ---- COE (admin panel)

    @GetMapping("/api/admin/internal-scheme")
    InternalMarkService.Scheme scheme() {
        return internals.scheme(departments.college());
    }

    @PutMapping("/api/admin/internal-scheme")
    InternalMarkService.Scheme saveScheme(@RequestBody SchemeInput in, HttpServletRequest http) {
        return internals.saveScheme(in == null ? null : in.config(), in != null && in.confirmed(),
                in == null || in.visibleToStudents(), http.getRemoteAddr());
    }

    @GetMapping("/api/admin/internal-marks")
    InternalMarkService.Roster adminRoster(@RequestParam String dept, @RequestParam String semester,
                                           @RequestParam String subject) {
        return internals.roster(departments.key(dept), semester, subject);
    }

    @GetMapping("/api/admin/internal-marks/history")
    List<InternalMarkService.HistoryItem> adminHistory(@RequestParam String dept, @RequestParam String semester,
                                                       @RequestParam String subject,
                                                       @RequestParam(required = false) String regNo) {
        return internals.history(departments.key(dept), semester, subject, regNo);
    }

    // ---- faculty (own department)

    @GetMapping("/api/faculty/internal-marks")
    InternalMarkService.Roster facultyRoster(@RequestParam String semester, @RequestParam String subject) {
        return internals.roster(CurrentUser.get().deptKey(), semester, subject);
    }

    @PutMapping("/api/faculty/internal-marks")
    InternalMarkService.Roster facultySave(@RequestBody InternalMarkService.SaveRequest r, HttpServletRequest http) {
        return internals.save(CurrentUser.get().deptKey(), r, http.getRemoteAddr());
    }

    @GetMapping("/api/faculty/internal-marks/history")
    List<InternalMarkService.HistoryItem> facultyHistory(@RequestParam String semester, @RequestParam String subject,
                                                         @RequestParam(required = false) String regNo) {
        return internals.history(CurrentUser.get().deptKey(), semester, subject, regNo);
    }

    // ---- HOD (own department: view and correct)

    @GetMapping("/api/hod/internal-marks")
    InternalMarkService.Roster hodRoster(@RequestParam String semester, @RequestParam String subject) {
        return internals.roster(CurrentUser.get().deptKey(), semester, subject);
    }

    @PutMapping("/api/hod/internal-marks")
    InternalMarkService.Roster hodSave(@RequestBody InternalMarkService.SaveRequest r, HttpServletRequest http) {
        return internals.save(CurrentUser.get().deptKey(), r, http.getRemoteAddr());
    }

    @GetMapping("/api/hod/internal-marks/history")
    List<InternalMarkService.HistoryItem> hodHistory(@RequestParam String semester, @RequestParam String subject,
                                                     @RequestParam(required = false) String regNo) {
        return internals.history(CurrentUser.get().deptKey(), semester, subject, regNo);
    }

    // ---- student (own marks)

    @GetMapping("/api/student/internal-marks")
    InternalMarkService.StudentView mine() {
        return internals.forStudent(CurrentUser.get().regNo());
    }

    @GetMapping("/api/student/internal-marks/history")
    List<InternalMarkService.HistoryItem> myHistory(@RequestParam String subject) {
        CurrentUser me = CurrentUser.get();
        if (!internals.forStudent(me.regNo()).visible()) return List.of();
        return internals.studentHistory(me.regNo(), subject);
    }
}
