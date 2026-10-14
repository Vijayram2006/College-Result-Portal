package edu.kvell.results.marks;

import edu.kvell.results.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/marks")
public class MarkController {

    private final MarkService marks;

    public MarkController(MarkService marks) {
        this.marks = marks;
    }

    /** The Mark Entry roster ("Fetch Data"). */
    @GetMapping
    List<MarkService.StudentMark> roster(@RequestParam String dept, @RequestParam String semester,
                                         @RequestParam String subject, @RequestParam String assessment) {
        return marks.roster(dept, semester, subject, assessment);
    }

    /** All entered marks (published or not), for Analytics. */
    @GetMapping("/all")
    List<MarkService.StudentMark> all() {
        return marks.allEntered();
    }

    /** "Confirm Mark" for one student's answer script. */
    @PutMapping
    MarkService.StudentMark save(@RequestBody MarkService.MarkRequest request, HttpServletRequest http) {
        return marks.save(request, CurrentUser.get(), http.getRemoteAddr());
    }
}
