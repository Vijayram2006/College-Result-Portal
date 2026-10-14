package edu.kvell.results.subjects;

import edu.kvell.results.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/subjects")
public class SubjectController {

    private final SubjectService subjects;

    public SubjectController(SubjectService subjects) {
        this.subjects = subjects;
    }

    @GetMapping
    List<SubjectService.SubjectItem> list(@RequestParam(required = false) String dept) {
        return subjects.list(dept);
    }

    @PostMapping
    ResponseEntity<SubjectService.SubjectItem> create(@RequestBody SubjectService.SubjectItem subject,
                                                      HttpServletRequest http) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(subjects.create(subject, CurrentUser.get(), http.getRemoteAddr()));
    }

    @PutMapping("/{id}/status")
    SubjectService.SubjectItem setStatus(@PathVariable long id, @RequestBody Map<String, String> body,
                                         HttpServletRequest http) {
        return subjects.setStatus(id, body.get("status"), CurrentUser.get(), http.getRemoteAddr());
    }

    @PostMapping("/finalize")
    Map<String, Integer> finalizeAll(HttpServletRequest http) {
        return Map.of("updated", subjects.finalizeAll(CurrentUser.get(), http.getRemoteAddr()));
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable long id, HttpServletRequest http) {
        subjects.delete(id, CurrentUser.get(), http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    Map<String, Integer> deleteAll(HttpServletRequest http) {
        return Map.of("deleted", subjects.deleteAll(CurrentUser.get(), http.getRemoteAddr()));
    }
}
