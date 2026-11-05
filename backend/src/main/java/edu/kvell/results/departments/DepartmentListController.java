package edu.kvell.results.departments;

import edu.kvell.results.common.Departments;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** The active departments of the signed-in user's college (key, code, full name), for the filters of every portal. */
@RestController
public class DepartmentListController {

    public record Option(String key, String code, String name) {
    }

    private final JdbcClient db;
    private final Departments departments;

    public DepartmentListController(JdbcClient db, Departments departments) {
        this.db = db;
        this.departments = departments;
    }

    @GetMapping("/api/departments")
    List<Option> list() {
        return db.sql("""
                        SELECT dept_key, coalesce(code, upper(dept_key)), name FROM departments
                        WHERE college_key = ? AND status = 'ACTIVE' ORDER BY name
                        """).param(departments.college())
                .query((rs, n) -> new Option(rs.getString(1), rs.getString(2), rs.getString(3))).list();
    }
}
