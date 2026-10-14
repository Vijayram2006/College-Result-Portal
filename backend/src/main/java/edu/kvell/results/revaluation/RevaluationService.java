package edu.kvell.results.revaluation;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import edu.kvell.results.governance.GovernanceService;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.Year;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Student revaluation / answer-script photocopy requests. Students apply (only while the Super Admin's revaluation
 * window is open) for subjects of their own published results; their college's COE works through the requests.
 */
@Service
public class RevaluationService {

    public record ApplyRequest(String semester, String assessmentType, List<String> subjectCodes) {
    }

    public record StatusRequest(String status, String note) {
    }

    public record Request(long id, String refId, String regNo, String studentName, String deptKey, String departmentName,
                          String semester, String assessmentType, List<String> subjectCodes, int feePerCourse,
                          int totalFee, String status, String note, String createdAt, String updatedBy,
                          String updatedAt) {
    }

    private static final Set<String> STATUSES = Set.of("SUBMITTED", "IN_REVIEW", "COMPLETED", "REJECTED");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient db;
    private final GovernanceService governance;
    private final Departments departments;
    private final AuditService audit;

    public RevaluationService(JdbcClient db, GovernanceService governance, Departments departments,
                              AuditService audit) {
        this.db = db;
        this.governance = governance;
        this.departments = departments;
        this.audit = audit;
    }

    @Transactional
    public Request apply(ApplyRequest req, CurrentUser student, String ip) {
        int fee = governance.requireRevaluationOpen();
        if (req == null || req.subjectCodes() == null || req.subjectCodes().isEmpty()) {
            throw ApiException.badRequest("Choose at least one subject");
        }
        int sem = Semesters.parse(req.semester());
        String assessment = req.assessmentType() == null || req.assessmentType().isBlank()
                ? "End Semester" : req.assessmentType().trim();
        Set<String> codes = new LinkedHashSet<>();
        for (String c : req.subjectCodes()) {
            if (c != null && !c.isBlank()) codes.add(c.trim().toUpperCase(Locale.ROOT));
        }
        if (codes.isEmpty() || codes.size() > 12) throw ApiException.badRequest("Choose between 1 and 12 subjects");

        // Only subjects of the student's own published results
        List<String> published = db.sql("""
                        SELECT DISTINCT b.subject_code FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                        WHERE r.reg_no = ? AND b.status = 'PUBLISHED' AND b.semester = ?
                          AND coalesce(r.assessment_type, 'End Semester') = ?
                        """)
                .params(student.regNo(), sem, assessment).query(String.class).list();
        for (String code : codes) {
            if (!published.contains(code)) {
                throw ApiException.badRequest(code + " is not one of your published " + assessment + " results");
            }
        }
        boolean pending = db.sql("""
                        SELECT count(*) FROM revaluation_requests
                        WHERE reg_no = ? AND semester = ? AND assessment_type = ? AND status IN ('SUBMITTED', 'IN_REVIEW')
                        """)
                .params(student.regNo(), sem, assessment).query(Integer.class).single() > 0;
        if (pending) {
            throw ApiException.conflict("You already have a revaluation request in progress for these results");
        }

        String dept = db.sql("SELECT dept_key FROM students WHERE reg_no = ?").param(student.regNo())
                .query(String.class).single();
        String ref = "REV-" + Year.now(GovernanceService.ZONE) + "-" + String.format("%06d", RANDOM.nextInt(1_000_000));
        db.sql("""
                        INSERT INTO revaluation_requests (ref_id, reg_no, dept_key, semester, assessment_type,
                                                          subject_codes, fee_per_course, total_fee)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """)
                .params(ref, student.regNo(), dept, sem, assessment, String.join(",", codes), fee, fee * codes.size())
                .update();
        audit.record(student.username(), student.name(), "REQUESTED_REVALUATION", ref,
                "Requested revaluation of " + String.join(", ", codes) + " (" + assessment + ", "
                        + Semesters.label(sem) + "); fee " + fee * codes.size() + ".", ip);
        return list("r.ref_id = ?", ref).getFirst();
    }

    public List<Request> mine(CurrentUser student) {
        return list("r.reg_no = ?", student.regNo());
    }

    /** The COE's inbox: requests from the signed-in user's college only. */
    public List<Request> forCollege() {
        return list(departments.inCollege("r.dept_key"));
    }

    @Transactional
    public Request setStatus(long id, StatusRequest req, CurrentUser by, String ip) {
        String status = req == null || req.status() == null ? "" : req.status().trim().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(status)) throw ApiException.badRequest("Unknown status");
        String note = req.note() == null ? null : req.note().trim();
        if (note != null && note.length() > 500) throw ApiException.badRequest("The note is too long");
        List<Request> found = list("r.id = ? AND " + departments.inCollege("r.dept_key"), id);
        if (found.isEmpty()) throw ApiException.notFound("Revaluation request not found");
        db.sql("UPDATE revaluation_requests SET status = ?, note = ?, updated_by = ?, updated_at = now() WHERE id = ?")
                .params(status, note == null || note.isEmpty() ? null : note, by.name() + " (" + by.username() + ")", id)
                .update();
        audit.record(by.username(), by.name(), "UPDATED_REVALUATION", found.getFirst().refId(),
                "Marked " + found.getFirst().refId() + " (" + found.getFirst().regNo() + ") as " + status
                        + (note == null || note.isEmpty() ? "." : ": " + note), ip);
        return list("r.id = ?", id).getFirst();
    }

    private List<Request> list(String where, Object... params) {
        return db.sql("""
                        SELECT r.id, r.ref_id, r.reg_no, s.name, r.dept_key, d.name AS dept_name, r.semester,
                               r.assessment_type, r.subject_codes, r.fee_per_course, r.total_fee, r.status, r.note,
                               r.created_at, r.updated_by, r.updated_at
                        FROM revaluation_requests r
                        JOIN students s ON s.reg_no = r.reg_no
                        JOIN departments d ON d.dept_key = r.dept_key
                        """ + " WHERE " + where + " ORDER BY r.created_at DESC, r.id DESC")
                .params(params)
                .query((rs, n) -> new Request(rs.getLong("id"), rs.getString("ref_id"), rs.getString("reg_no"),
                        rs.getString("name"), rs.getString("dept_key"), rs.getString("dept_name"),
                        Semesters.label(rs.getInt("semester")), rs.getString("assessment_type"),
                        Arrays.asList(rs.getString("subject_codes").split(",")), rs.getInt("fee_per_course"),
                        rs.getInt("total_fee"), rs.getString("status"), rs.getString("note"),
                        Semesters.display(rs.getObject("created_at", OffsetDateTime.class)), rs.getString("updated_by"),
                        Semesters.display(rs.getObject("updated_at", OffsetDateTime.class))))
                .list();
    }
}
