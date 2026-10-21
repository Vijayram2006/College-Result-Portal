package edu.kvell.results.admin;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import edu.kvell.results.governance.GovernanceService;
import edu.kvell.results.governance.SystemConfig;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The optional approval of forwarded marks (governance, set by the Chief COE): the department's HOD approves a
 * forwarded subject, then the college's Associate Dean, and only then may the college COE publish it. Either can
 * return the subject to the faculty with a reason; forwarding it again starts over (a new batch has no approvals).
 */
@Service
public class MarkApprovalService {

    /** One forwarded, unpublished subject and where it stands. */
    public record Item(String batchId, String deptKey, String departmentName, String semester, String assessmentType,
                       String subjectCode, String subjectTitle, int students, double passPercentage,
                       String forwardedBy, String forwardedAt, String hodApprovedBy, String hodApprovedAt,
                       String deanApprovedBy, String deanApprovedAt, String returnedBy, String returnReason,
                       boolean waitingForYou) {
    }

    public record Overview(boolean hodApproval, boolean deanApproval, List<Item> items) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final GovernanceService governance;
    private final AuditService audit;
    private final NotificationService notifications;

    public MarkApprovalService(JdbcClient db, Departments departments, GovernanceService governance,
                               AuditService audit, NotificationService notifications) {
        this.db = db;
        this.departments = departments;
        this.governance = governance;
        this.audit = audit;
        this.notifications = notifications;
    }

    /** The HOD sees the department's forwarded subjects, the Associate Dean the college's. */
    public Overview list(CurrentUser user) {
        SystemConfig.MarkApproval chain = governance.markApproval();
        String scope = user.role() == Role.HOD ? " b.dept_key = :dept " : departments.inCollege("b.dept_key");
        List<Item> items = db.sql("""
                        SELECT b.id, b.dept_key, d.name AS dept_name, b.semester, b.assessment_type, b.subject_code,
                               b.subject_title, b.forwarded_by, b.forwarded_at, b.hod_approved_by, b.hod_approved_at,
                               b.ad_approved_by, b.ad_approved_at, b.returned_by, b.return_reason,
                               (SELECT count(*) FROM result_records r WHERE r.batch_id = b.id) AS students,
                               (SELECT count(*) FROM result_records r WHERE r.batch_id = b.id AND r.passed) AS passed
                        FROM result_batches b JOIN departments d ON d.dept_key = b.dept_key
                        WHERE b.status = 'VALIDATED' AND """ + scope + """
                        ORDER BY b.forwarded_at DESC
                        """)
                .params(user.role() == Role.HOD ? java.util.Map.of("dept", user.deptKey()) : java.util.Map.<String, Object>of())
                .query((rs, n) -> {
                    int students = rs.getInt("students");
                    String hod = rs.getString("hod_approved_by");
                    String dean = rs.getString("ad_approved_by");
                    boolean returned = rs.getString("returned_by") != null;
                    boolean waiting = !returned && (user.role() == Role.HOD ? hod == null
                            : dean == null && (!chain.hodApproval() || hod != null));
                    return new Item(rs.getString("id"), rs.getString("dept_key"), rs.getString("dept_name"),
                            Semesters.label(rs.getInt("semester")), rs.getString("assessment_type"),
                            rs.getString("subject_code"), rs.getString("subject_title"), students,
                            students == 0 ? 0 : Math.round(1000.0 * rs.getInt("passed") / students) / 10.0,
                            rs.getString("forwarded_by"), stamp(rs, "forwarded_at"), hod, stamp(rs, "hod_approved_at"),
                            dean, stamp(rs, "ad_approved_at"), rs.getString("returned_by"), rs.getString("return_reason"),
                            waiting);
                })
                .list();
        return new Overview(chain.hodApproval(), chain.deanApproval(), items);
    }

    @Transactional
    public Item approve(String batchId, CurrentUser user, String ip) {
        Batch b = batch(batchId, user);
        SystemConfig.MarkApproval chain = governance.markApproval();
        String who = user.name() + " (" + user.username() + ")";
        if (user.role() == Role.HOD) {
            if (b.hodApprovedBy() != null) throw ApiException.conflict("You have already approved these marks");
            db.sql("UPDATE result_batches SET hod_approved_by = ?, hod_approved_at = now() WHERE id = ?")
                    .params(who, batchId).update();
        } else {
            if (chain.hodApproval() && b.hodApprovedBy() == null) {
                throw ApiException.conflict("The HOD has not approved these marks yet");
            }
            if (b.deanApprovedBy() != null) throw ApiException.conflict("You have already approved these marks");
            db.sql("UPDATE result_batches SET ad_approved_by = ?, ad_approved_at = now() WHERE id = ?")
                    .params(who, batchId).update();
        }
        String role = user.role() == Role.HOD ? "HOD" : "Associate Dean";
        audit.record(user.username(), user.name(), "APPROVED_FORWARDED_MARKS", batchId + " (" + b.subjectCode() + ")",
                "The " + role + " approved the forwarded " + b.assessmentType() + " marks of " + b.subjectCode() + ".", ip);
        String what = b.subjectCode() + " " + b.assessmentType() + " (" + Semesters.label(b.semester()) + ")";
        boolean deanNext = user.role() == Role.HOD && chain.deanApproval();
        notifications.notify(deanNext ? Audience.DEAN : Audience.COE, b.deptKey(), b.semester(),
                "Marks approved by the " + role + ": " + what,
                deanNext ? "Your approval is needed before the COE can publish them."
                        : "The approvals are complete; the marks can be published.",
                deanNext ? "mark-approvals" : "/admin/results/publish");
        return item(batchId, user);
    }

    /** Sends the subject back to the faculty: it cannot be published until they forward it again. */
    @Transactional
    public Item returnToFaculty(String batchId, String reason, CurrentUser user, String ip) {
        String why = reason == null ? "" : reason.trim();
        if (why.length() < 5 || why.length() > 300) {
            throw ApiException.badRequest("Give the reason for returning the marks (5-300 characters)");
        }
        Batch b = batch(batchId, user);
        db.sql("""
                        UPDATE result_batches SET returned_by = ?, returned_at = now(), return_reason = ?,
                                                  hod_approved_by = NULL, hod_approved_at = NULL,
                                                  ad_approved_by = NULL, ad_approved_at = NULL
                        WHERE id = ?
                        """)
                .params(user.name() + " (" + user.username() + ")", why, batchId).update();
        String role = user.role() == Role.HOD ? "HOD" : "Associate Dean";
        audit.record(user.username(), user.name(), "RETURNED_FORWARDED_MARKS", batchId + " (" + b.subjectCode() + ")",
                "The " + role + " returned the " + b.assessmentType() + " marks of " + b.subjectCode() + " to the faculty: "
                        + why, ip);
        notifications.notify(Audience.FACULTY, b.deptKey(), b.semester(),
                b.subjectCode() + " " + b.assessmentType() + " marks returned",
                "The " + role + " returned the marks for correction: " + why + " Correct them and forward again.", null);
        return item(batchId, user);
    }

    private record Batch(String id, String deptKey, int semester, String subjectCode, String assessmentType,
                         String hodApprovedBy, String deanApprovedBy, String returnedBy) {
    }

    /** A forwarded, unpublished subject in the user's department (HOD) or college (Associate Dean). */
    private Batch batch(String batchId, CurrentUser user) {
        if (user.role() != Role.HOD && user.role() != Role.DEAN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the HOD or the Associate Dean approves forwarded marks");
        }
        Batch b = db.sql("""
                        SELECT id, dept_key, semester, subject_code, assessment_type, hod_approved_by, ad_approved_by,
                               returned_by
                        FROM result_batches b WHERE id = ? AND status = 'VALIDATED' AND """
                        + departments.inCollege("b.dept_key"))
                .params(batchId)
                .query((rs, n) -> new Batch(rs.getString("id"), rs.getString("dept_key"), rs.getInt("semester"),
                        rs.getString("subject_code"), rs.getString("assessment_type"), rs.getString("hod_approved_by"),
                        rs.getString("ad_approved_by"), rs.getString("returned_by")))
                .optional().orElseThrow(() -> ApiException.notFound("Forwarded marks not found"));
        if (user.role() == Role.HOD && !b.deptKey().equals(user.deptKey())) {
            throw ApiException.notFound("Forwarded marks not found");
        }
        if (b.returnedBy() != null) {
            throw ApiException.conflict("These marks were returned to the faculty; they must be forwarded again");
        }
        return b;
    }

    private Item item(String batchId, CurrentUser user) {
        return list(user).items().stream().filter(i -> i.batchId().equals(batchId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Forwarded marks not found"));
    }

    private static String stamp(java.sql.ResultSet rs, String col) throws java.sql.SQLException {
        return Semesters.display(rs.getObject(col, OffsetDateTime.class));
    }
}
