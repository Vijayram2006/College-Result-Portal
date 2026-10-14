package edu.kvell.results.hod;

import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Semesters;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** Department analytics for a HOD, computed only from published results in their own department. */
@Service
public class HodService {

    public record YearPass(String name, double passPercentage, int students) {
    }

    public record StudentRow(String reg, String name, String year, String sem, String section, Double average,
                             String status) {
    }

    /** An examiner's published subject, ranked by pass percentage (the "Top Pass Percentage Faculty" card). */
    public record TopFaculty(int rank, String name, String designation, String subjectCode, String subjectTitle,
                             double passPercentage, int students) {
    }

    public record Overview(String departmentKey, String departmentName, double overallPassPercentage,
                           int studentsWithResults, List<YearPass> yearPass, List<StudentRow> students,
                           List<TopFaculty> topFaculty) {
    }

    private static final String[] YEARS = {"1st Year", "2nd Year", "3rd Year", "4th Year"};

    private final JdbcClient db;

    public HodService(JdbcClient db) {
        this.db = db;
    }

    public Overview overview(String deptKey) {
        String deptName = db.sql("SELECT name FROM departments WHERE dept_key = ?").param(deptKey)
                .query(String.class).optional()
                .orElseThrow(() -> ApiException.notFound("Department not found"));

        // Each student's latest published semester: average total and whether any course failed.
        List<StudentRow> students = db.sql("""
                        WITH published AS (
                            SELECT r.reg_no, b.semester, r.total, r.passed,
                                   CASE b.assessment_type WHEN 'IAT-1' THEN 1 WHEN 'IAT-2' THEN 2 ELSE 3 END AS stage
                            FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                            WHERE b.status = 'PUBLISHED' AND b.dept_key = :dept),
                        latest AS (
                            -- each student's latest published semester, and within it the latest assessment
                            SELECT DISTINCT ON (reg_no) reg_no, semester, stage FROM published
                            ORDER BY reg_no, semester DESC, stage DESC),
                        summary AS (
                            SELECT p.reg_no, p.semester, round(avg(p.total), 1) AS average, bool_and(p.passed) AS passed
                            FROM published p JOIN latest l ON l.reg_no = p.reg_no AND l.semester = p.semester
                                                           AND l.stage = p.stage
                            GROUP BY p.reg_no, p.semester)
                        SELECT s.reg_no, s.name, s.year_label, s.category, s.semester AS current_semester,
                               m.semester, m.average, m.passed
                        FROM students s LEFT JOIN summary m ON m.reg_no = s.reg_no
                        WHERE s.dept_key = :dept
                        ORDER BY s.year_label, (s.category = 'lateral'), s.reg_no
                        """)
                .param("dept", deptKey)
                .query((rs, n) -> {
                    BigDecimal avg = rs.getBigDecimal("average");
                    boolean hasResult = avg != null;
                    int sem = hasResult ? rs.getInt("semester") : rs.getInt("current_semester");
                    String status = !hasResult ? "AWAITING" : rs.getBoolean("passed") ? "PASS" : "FAIL";
                    return new StudentRow(rs.getString("reg_no"), rs.getString("name"), rs.getString("year_label"),
                            Semesters.label(sem), capitalize(rs.getString("category")), hasResult ? avg.doubleValue() : null, status);
                })
                .list();

        Map<String, int[]> perYear = new LinkedHashMap<>();
        for (String y : YEARS) perYear.put(y, new int[2]); // [withResults, passed]
        int withResults = 0;
        int passed = 0;
        for (StudentRow s : students) {
            if ("AWAITING".equals(s.status())) continue;
            int[] counts = perYear.computeIfAbsent(s.year(), k -> new int[2]);
            counts[0]++;
            withResults++;
            if ("PASS".equals(s.status())) {
                counts[1]++;
                passed++;
            }
        }
        List<YearPass> yearPass = new ArrayList<>();
        perYear.forEach((year, c) -> yearPass.add(
                new YearPass(year.replace(" Year", " yr"), percent(c[1], c[0]), c[0])));

        // Examiners of the department's published subjects, best pass percentage first
        List<TopFaculty> topFaculty = new ArrayList<>();
        db.sql("""
                        SELECT min(trim(m.examiner_name)) AS examiner_name,
                               string_agg(DISTINCT m.examiner_designation, ' / ') AS examiner_designation,
                               m.subject_code, min(m.subject_title) || ' (' || m.assessment_type || ')' AS subject_title,
                               count(*) AS students, count(*) FILTER (WHERE m.passed) AS passed
                        FROM marks m
                        JOIN result_batches b ON b.dept_key = m.dept_key AND b.semester = m.semester
                                             AND b.subject_code = m.subject_code AND b.status = 'PUBLISHED'
                                             AND b.assessment_type = m.assessment_type
                        WHERE m.dept_key = ?
                        GROUP BY upper(trim(m.examiner_name)), m.subject_code, m.assessment_type
                        -- examiners with a meaningful number of scripts (5+) rank first, then by pass percentage
                        ORDER BY (count(*) >= 5) DESC, count(*) FILTER (WHERE m.passed) * 1.0 / count(*) DESC,
                                 count(*) DESC
                        LIMIT 5
                        """)
                .param(deptKey)
                .query((rs, n) -> topFaculty.add(new TopFaculty(n + 1, rs.getString("examiner_name"),
                        rs.getString("examiner_designation"), rs.getString("subject_code"),
                        rs.getString("subject_title"), percent(rs.getInt("passed"), rs.getInt("students")),
                        rs.getInt("students"))))
                .list();

        return new Overview(deptKey, deptName, percent(passed, withResults), withResults, yearPass, students,
                topFaculty);
    }

    private static String capitalize(String s) {
        return s == null || s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static double percent(int part, int whole) {
        if (whole == 0) return 0;
        return BigDecimal.valueOf(part * 100.0 / whole).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
