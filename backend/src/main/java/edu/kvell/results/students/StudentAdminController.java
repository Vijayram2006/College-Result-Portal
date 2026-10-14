package edu.kvell.results.students;

import edu.kvell.results.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/students")
public class StudentAdminController {

    private final StudentAdminService students;

    public StudentAdminController(StudentAdminService students) {
        this.students = students;
    }

    @GetMapping
    List<StudentAdminService.StudentView> list(@RequestParam(required = false) String dept,
                                               @RequestParam(required = false) String semester) {
        return students.list(dept, semester);
    }

    /** Adds new students and updates existing ones (matched by Register Number). */
    @PutMapping
    StudentAdminService.SaveResult save(@RequestBody StudentAdminService.SaveRequest request,
                                        HttpServletRequest http) {
        return students.save(request, CurrentUser.get(), http.getRemoteAddr());
    }

    @DeleteMapping("/{regNo}")
    ResponseEntity<Void> delete(@PathVariable String regNo, HttpServletRequest http) {
        students.delete(regNo, CurrentUser.get(), http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    Map<String, Integer> deleteGroup(@RequestParam String dept, @RequestParam String year,
                                     @RequestParam String semester, HttpServletRequest http) {
        return Map.of("deleted", students.deleteGroup(dept, year, semester, CurrentUser.get(), http.getRemoteAddr()));
    }
}
