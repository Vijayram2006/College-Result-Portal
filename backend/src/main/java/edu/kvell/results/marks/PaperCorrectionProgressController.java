package edu.kvell.results.marks;

import edu.kvell.results.common.Departments;
import java.util.ArrayList;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The Associate Dean's view of paper correction: a subject's answer scripts in the evaluators' order (position, dummy
 * number and the marks saved so far). Each evaluator's bundle in the allotment is a range of these positions, so the
 * Dean sees the real progress and marks of every evaluator without the students' identities.
 */
@RestController
public class PaperCorrectionProgressController {

    /** One answer script in evaluation order; position is 1-based, as in the allotment's script ranges. */
    public record Script(int position, String dummyCode, boolean evaluated, double partATotal, double partBCTotal,
                         int total, String grade) {
    }

    private final AnonymousEvaluation anonymous;
    private final Departments departments;

    public PaperCorrectionProgressController(AnonymousEvaluation anonymous, Departments departments) {
        this.anonymous = anonymous;
        this.departments = departments;
    }

    @GetMapping("/api/dean/paper-correction/scripts")
    List<Script> scripts(@RequestParam String dept, @RequestParam String semester, @RequestParam String subject,
                         @RequestParam String assessment) {
        // departments.key keeps the request inside the Dean's own college
        List<MarkService.StudentMark> order = anonymous.evaluationOrder(departments.key(dept), semester, subject,
                assessment);
        List<Script> out = new ArrayList<>(order.size());
        for (int i = 0; i < order.size(); i++) {
            MarkService.StudentMark m = order.get(i);
            out.add(new Script(i + 1, m.regNo(), m.hasMarks(), m.partATotal(), m.partBCTotal(), m.grandTotal(),
                    m.hasMarks() ? m.grade() : null));
        }
        return out;
    }
}
