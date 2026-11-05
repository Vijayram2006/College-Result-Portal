package edu.kvell.results.certificates;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.erp.ErpSupport;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Certificate requests (bonafide, 10th / 12th marksheet, transfer certificate). The student applies; the HOD approves
 * or rejects with remarks, then forwards the approved request to the Administrative Office, which issues it.
 */
@RestController
public class CertificateController {

    static final Set<String> TYPES = Set.of("BONAFIDE", "MARKSHEET_10", "MARKSHEET_12", "TRANSFER_CERTIFICATE");
    static final Map<String, String> LABELS = Map.of("BONAFIDE", "Bonafide Certificate", "MARKSHEET_10", "10th Marksheet",
            "MARKSHEET_12", "12th Marksheet", "TRANSFER_CERTIFICATE", "Transfer Certificate");

    public record CreateRequest(String certificateType, String purpose) {
    }

    public record RemarksRequest(String remarks) {
    }

    public record StudentView(long id, String studentReg, String certificateType, String purpose, String status, String createdAt) {
    }

    public record HodView(long id, String studentReg, String studentName, String deptKey, String certificateType, String purpose,
                          String status, String createdAt, String hodRemarks, String hodActionBy, String hodActionAt,
                          String forwardedBy, String forwardedAt) {
    }

    private final JdbcClient db;
    private final NotificationService notifications;

    public CertificateController(JdbcClient db, NotificationService notifications) {
        this.db = db;
        this.notifications = notifications;
    }

    @GetMapping("/api/student/certificates")
    List<StudentView> mine() {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        return db.sql("""
                        SELECT id, reg_no, certificate_type, purpose, status, created_at FROM certificate_requests
                        WHERE reg_no = ? ORDER BY created_at DESC
                        """).param(me.regNo())
                .query((rs, n) -> new StudentView(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        time(rs.getObject(6, OffsetDateTime.class))))
                .list();
    }

    @PostMapping("/api/student/certificates")
    @Transactional
    StudentView apply(@RequestBody CreateRequest req) {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        String type = req == null || req.certificateType() == null ? "" : req.certificateType().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(type)) throw ApiException.badRequest("Choose the certificate");
        int open = db.sql("SELECT count(*) FROM certificate_requests WHERE reg_no = ? AND certificate_type = ? AND status IN ('PENDING', 'HOD_APPROVED')")
                .params(me.regNo(), type).query(Integer.class).single();
        if (open > 0) throw ApiException.conflict("You already have a " + LABELS.get(type) + " request in progress");
        String purpose = req.purpose() == null || req.purpose().isBlank() ? null : clip(req.purpose().trim(), 500);
        long id = db.sql("INSERT INTO certificate_requests (reg_no, certificate_type, purpose) VALUES (?, ?, ?) RETURNING id")
                .params(me.regNo(), type, purpose).query(Long.class).single();
        notifications.notify(Audience.HOD, me.deptKey(), null, "Certificate request",
                me.name() + " (" + me.regNo() + ") applied for a " + LABELS.get(type) + ". Open Certificate Requests to decide.",
                "certificates");
        return mine().stream().filter(v -> v.id() == id).findFirst().orElseThrow();
    }

    @GetMapping("/api/hod/certificates")
    List<HodView> hodList(@RequestParam(required = false) String status) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        String st = status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) ? null : status.toUpperCase(Locale.ROOT);
        return db.sql("""
                        SELECT c.id, c.reg_no, s.name, s.dept_key, c.certificate_type, c.purpose, c.status, c.created_at, c.hod_remarks,
                               c.hod_action_by, c.hod_action_at, c.forwarded_by, c.forwarded_at
                        FROM certificate_requests c JOIN students s ON s.reg_no = c.reg_no
                        WHERE s.dept_key = ? AND (CAST(? AS VARCHAR) IS NULL OR c.status = ?)
                        ORDER BY (c.status = 'PENDING') DESC, c.created_at DESC
                        """).params(me.deptKey(), st, st)
                .query((rs, n) -> new HodView(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), rs.getString(7), time(rs.getObject(8, OffsetDateTime.class)), rs.getString(9), rs.getString(10),
                        time(rs.getObject(11, OffsetDateTime.class)), rs.getString(12), time(rs.getObject(13, OffsetDateTime.class))))
                .list();
    }

    @PostMapping("/api/hod/certificates/{id}/approve")
    @Transactional
    HodView approve(@PathVariable long id, @RequestBody(required = false) RemarksRequest req) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        Map<String, Object> c = request(me, id, "PENDING");
        db.sql("UPDATE certificate_requests SET status = 'HOD_APPROVED', hod_remarks = ?, hod_action_by = ?, hod_action_at = now() WHERE id = ?")
                .params(remarks(req), me.name(), id).update();
        tell(c, "approved by the HOD. It will be forwarded to the Administrative Office.");
        return view(me, id);
    }

    @PostMapping("/api/hod/certificates/{id}/reject")
    @Transactional
    HodView reject(@PathVariable long id, @RequestBody(required = false) RemarksRequest req) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        Map<String, Object> c = request(me, id, "PENDING");
        String r = remarks(req);
        if (r == null) throw ApiException.badRequest("Give the reason for rejecting it");
        db.sql("UPDATE certificate_requests SET status = 'REJECTED_BY_HOD', hod_remarks = ?, hod_action_by = ?, hod_action_at = now() WHERE id = ?")
                .params(r, me.name(), id).update();
        tell(c, "rejected by the HOD: " + r);
        return view(me, id);
    }

    @PostMapping("/api/hod/certificates/{id}/forward")
    @Transactional
    HodView forward(@PathVariable long id) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        Map<String, Object> c = request(me, id, "HOD_APPROVED");
        db.sql("UPDATE certificate_requests SET status = 'FORWARDED_TO_AO', forwarded_by = ?, forwarded_at = now() WHERE id = ?")
                .params(me.name(), id).update();
        tell(c, "forwarded to the Administrative Office. Collect it from the office when it is ready.");
        return view(me, id);
    }

    private Map<String, Object> request(CurrentUser me, long id, String expected) {
        Map<String, Object> c = db.sql("""
                        SELECT c.reg_no, c.certificate_type, c.status, s.dept_key FROM certificate_requests c
                        JOIN students s ON s.reg_no = c.reg_no WHERE c.id = ?
                        """).param(id).query().listOfRows().stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Request not found"));
        if (!me.deptKey().equals(c.get("dept_key"))) throw new ApiException(HttpStatus.FORBIDDEN, "This request is of another department");
        if (!expected.equals(c.get("status"))) {
            throw ApiException.conflict("This request is " + String.valueOf(c.get("status")).replace('_', ' ').toLowerCase(Locale.ROOT) + " already");
        }
        return c;
    }

    private void tell(Map<String, Object> c, String what) {
        db.sql("SELECT id FROM users WHERE reg_no = ? LIMIT 1").param(c.get("reg_no")).query(Long.class).optional()
                .ifPresent(uid -> notifications.notifyUser(uid, Audience.STUDENT, null, null, "Certificate request updated",
                        "Your " + LABELS.get((String) c.get("certificate_type")) + " request was " + what, "certificates"));
    }

    private HodView view(CurrentUser me, long id) {
        return hodList(null).stream().filter(v -> v.id() == id).findFirst().orElseThrow();
    }

    private static String remarks(RemarksRequest req) {
        return req == null || req.remarks() == null || req.remarks().isBlank() ? null : clip(req.remarks().trim(), 500);
    }

    private static String clip(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }

    private static String time(OffsetDateTime t) {
        return t == null ? null : t.toString();
    }
}
