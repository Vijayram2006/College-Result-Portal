package edu.kvell.results.admin;

import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import edu.kvell.results.marks.MarkService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Committing a subject's marks publishes them as a result batch. Students and HODs only ever see PUBLISHED
 * batches; unpublishing hides a batch again without losing it.
 */
@Service
public class ResultBatchService {

    /** Matches the admin panel's ResultRecordItem (internal = Part A total, external = Part B + C total). */
    public record RecordItem(String regNo, String studentName, String deptKey, String courseCode,
                             String courseTitle, int credits, String semester, BigDecimal internalMarks,
                             BigDecimal externalMarks, int totalMarks, String grade, int gradePoints,
                             String resultStatus, String assessmentType) {
    }

    /** Matches the admin panel's ResultBatchRecord. */
    public record ResultBatch(
            String id, String batchTitle, String departmentKey, String departmentName, String semester,
            int semesterNumber, String academicYear, String examMonthYear, String subjectCode, String subjectTitle,
            String uploadDate, String uploadedBy, int totalStudents, int passedStudents, double passPercentage,
            String publicationStatus, String publishedAt, String publishedBy, List<RecordItem> records,
            String assessmentType) {
    }

    /** Publish (or unpublish) every subject of one department and semester together. */
    public record PublishRequest(String deptKey, String semester, String academicYear, String examMonthYear,
                                 String assessmentType, String reason) {
    }

    public record PublishSummary(String deptKey, String departmentName, String semester, int subjects, int students,
                                 int passedStudents, double passPercentage, List<String> batchIds,
                                 String assessmentType) {
    }


    public record RecentUpload(String batchId, String department, String semester, int students, String status,
                               String date) {
    }

    /**
     * One subject on the Publish Results page. state: NO_MARKS, NOT_FORWARDED (marks entered but faculty has not
     * forwarded them), FORWARDED (awaiting the COE), PUBLISHED, or OUT_OF_DATE (marks changed after they were
     * forwarded, so they must be forwarded again).
     */
    public record PublishRow(String subjectCode, String subjectTitle, int students, int marksEntered, String state,
                             String batchId, String publishedAt, int publishedStudents, double passPercentage,
                             String forwardedBy) {
    }

    /** Faculty (or the COE) forwards one subject's marks for verification. */
    public record ForwardRequest(String deptKey, String semester, String subjectCode, String academicYear,
                                 String assessmentType) {
    }

    /** One department's live numbers for the dashboard table. */
    public record DepartmentRow(String deptKey, String name, int students, int studentsWithoutDob, int subjects,
                                int marksEntered, int publishedBatches, double passPercentage) {
    }

    /** Matches the admin panel's AdminDashboardStats. */
    public record DashboardStats(int totalStudents, int studentsWithoutDob, int marksEntered, int totalFaculty,
                                 int totalDepartments,
                                 int totalCourses, int pendingResults, int publishedResults,
                                 double overallPassPercentage, List<RecentUpload> recentUploads,
                                 List<DepartmentRow> departments) {
    }

    private record BatchRow(String id, String title, String deptKey, String deptName, int semester,
                            String academicYear, String examMonthYear, String subjectCode, String subjectTitle,
                            String status, String uploadedBy, OffsetDateTime uploadedAt, String publishedBy,
                            OffsetDateTime publishedAt, String assessmentType) {
    }

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient db;
    private final Departments departments;
    private final MarkService marks;
    private final AuditService audit;
    private final NotificationService notifications;

    @org.springframework.beans.factory.annotation.Autowired
    private edu.kvell.results.common.ResultsCache cache;

    public ResultBatchService(JdbcClient db, Departments departments, MarkService marks, AuditService audit,
                              NotificationService notifications) {
        this.db = db;
        this.departments = departments;
        this.marks = marks;
        this.audit = audit;
        this.notifications = notifications;
    }

    /**
     * Publishes the entered marks of one subject as a new batch (replacing that subject's earlier batch, so a student
     * never has two results for one subject). Only called from {@link #publishDepartment}, after the all-marks check.
     */
    private ResultBatch commitSubject(String deptKey, int sem, String code, String assessment, String academicYear,
                                      String exam, String status, CurrentUser user) {
        String title = marks.subjectTitle(deptKey, sem, code);
        // Publishing keeps who forwarded the marks; forwarding again records the new sender
        Map<String, Object> forwarded = db.sql("""
                        SELECT forwarded_by, forwarded_at FROM result_batches
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND assessment_type = ?
                        ORDER BY uploaded_at DESC LIMIT 1
                        """)
                .params(deptKey, sem, code, assessment).query().listOfRows().stream().findFirst().orElse(Map.of());
        boolean publishing = "PUBLISHED".equals(status);
        String forwardedBy = publishing ? (String) forwarded.get("forwarded_by")
                : user.name() + " (" + user.username() + ")";
        Object forwardedAt = publishing ? forwarded.get("forwarded_at") : null;

        List<String> replaced = db.sql("""
                        SELECT id FROM result_batches WHERE dept_key = ? AND semester = ? AND subject_code = ?
                          AND assessment_type = ?
                        """)
                .params(deptKey, sem, code, assessment).query(String.class).list();
        if (!replaced.isEmpty()) {
            db.sql("DELETE FROM result_batches WHERE id IN (:ids)").param("ids", replaced).update();
        }

        String examiners = String.join(", ", db.sql("""
                        SELECT DISTINCT examiner_name || ' (' || examiner_designation || ')' FROM marks
                        WHERE dept_key = ? AND semester = ? AND subject_code = ? AND assessment_type = ? ORDER BY 1
                        """)
                .params(deptKey, sem, code, assessment).query(String.class).list());
        String tag = switch (assessment) {
            case "IAT-1" -> "IAT1";
            case "IAT-2" -> "IAT2";
            default -> "ESE";
        };
        String id = "RES-" + Year.now().getValue() + "-" + deptKey.toUpperCase(Locale.ROOT) + "-" + code + "-" + tag
                + "-" + String.format("%04d", RANDOM.nextInt(10_000));
        String batchTitle = code + " " + Semesters.label(sem) + " " + assessment + " (" + departments.name(deptKey) + ")";
        db.sql("""
                        INSERT INTO result_batches (id, title, dept_key, semester, academic_year, exam_month_year,
                                                    subject_code, subject_title, status, uploaded_by,
                                                    published_by, published_at, forwarded_by, forwarded_at,
                                                    assessment_type)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? THEN now() END, ?,
                                coalesce(CAST(? AS TIMESTAMPTZ), now()), ?)
                        """)
                .params(id, batchTitle, deptKey, sem, academicYear, exam, code, title, status,
                        truncate(examiners, 200), publishing ? user.name() : null, publishing,
                        truncate(forwardedBy == null ? examiners : forwardedBy, 200), forwardedAt, assessment)
                .update();
        db.sql("""
                        INSERT INTO result_records (batch_id, reg_no, credits, part_a_total, part_bc_total, total,
                                                    grade, grade_points, passed, assessment_type)
                        SELECT ?, m.reg_no, coalesce(j.credits, 0), m.part_a_total, m.part_bc_total, m.grand_total,
                               m.grade,
                               CASE m.grade WHEN 'O' THEN 10 WHEN 'A+' THEN 9 WHEN 'A' THEN 8 WHEN 'B+' THEN 7
                                            WHEN 'B' THEN 6 WHEN 'C' THEN 5 ELSE 0 END,
                               m.passed, m.assessment_type
                        FROM marks m
                        LEFT JOIN subjects j ON j.dept_key = m.dept_key AND j.semester = m.semester
                                            AND j.code = m.subject_code
                        WHERE m.dept_key = ? AND m.semester = ? AND m.subject_code = ? AND m.assessment_type = ?
                        """)
                .params(id, deptKey, sem, code, assessment)
                .update();

        return get(id);
    }

    /**
     * Publishes ALL subjects of a department and semester together, only when every subject has marks for every
     * student. Students and the HOD see nothing until this succeeds, then see every subject at once.
     */
    @Transactional
    public PublishSummary publishDepartment(PublishRequest req, CurrentUser user, String ip) {
        cache.clear();
        if (req == null) throw ApiException.badRequest("Department and semester are required");
        String deptKey = departments.key(req.deptKey());
        int sem = Semesters.parse(req.semester());
        String academicYear = req.academicYear() == null || req.academicYear().isBlank() ? "2026 - 2027"
                : req.academicYear().trim();
        String assessment = MarkService.assessment(req.assessmentType());
        String exam = !"End Semester".equals(assessment) ? assessment + " (Internal Assessment)"
                : req.examMonthYear() == null || req.examMonthYear().isBlank() ? "Nov / Dec 2026"
                : req.examMonthYear().trim();

        requireAllMarksEntered(deptKey, sem, assessment);
        requireAllForwarded(deptKey, sem, assessment);
        List<String> codes = db.sql("SELECT code FROM subjects WHERE dept_key = ? AND semester = ? ORDER BY code")
                .params(deptKey, sem).query(String.class).list();
        if (codes.isEmpty()) {
            throw ApiException.conflict("Cannot publish: this department has no subjects in " + Semesters.label(sem) + ".");
        }
        List<String> batchIds = new ArrayList<>();
        for (String code : codes) {
            batchIds.add(commitSubject(deptKey, sem, code, assessment, academicYear, exam, "PUBLISHED", user).id());
        }

        // A student passes only when they passed every published subject
        Map<String, Object> pass = db.sql("""
                        SELECT count(*) AS total, count(*) FILTER (WHERE NOT failed) AS passed FROM (
                            SELECT r.reg_no, bool_or(NOT r.passed) AS failed
                            FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                            WHERE b.id IN (:ids) GROUP BY r.reg_no) x
                        """)
                .param("ids", batchIds).query().singleRow();
        int students = ((Number) pass.get("total")).intValue();
        int passed = ((Number) pass.get("passed")).intValue();
        double percent = percent(passed, students);
        String deptName = departments.name(deptKey);
        audit.record(user.username(), user.name(), "PUBLISHED_DEPARTMENT_RESULTS",
                deptKey.toUpperCase(Locale.ROOT) + " " + Semesters.label(sem) + " " + assessment,
                "Published " + assessment + " marks of " + codes.size() + " subjects (" + String.join(", ", codes) + ") for " + students
                        + " students to the student and HOD portals. Pass rate: " + percent + "%.", ip);
        String code = deptKey.toUpperCase(Locale.ROOT);
        notifications.notify(Audience.STUDENT, deptKey, sem, Semesters.label(sem) + " " + assessment + " results published",
                "Your " + Semesters.label(sem) + " " + assessment + " results are published. Open the Result Module to see your marks.",
                "result");
        for (Audience staff : new Audience[] {Audience.HOD, Audience.FACULTY}) {
            notifications.notify(staff, deptKey, sem, code + " " + Semesters.label(sem) + " " + assessment + " results published",
                    "The Controller of Examinations published " + codes.size() + " subjects for " + students
                            + " students. Pass rate: " + percent + "%.", null);
        }
        return new PublishSummary(deptKey, deptName, Semesters.label(sem), codes.size(), students, passed, percent,
                batchIds, assessment);
    }

    /**
     * Withdraws every published subject of a department and semester: students and the HOD no longer see them, the
     * marks are kept, and the batches stay WITHDRAWN (with who, when and why) until they are published again.
     */
    @Transactional
    public int unpublishDepartment(PublishRequest req, CurrentUser user, String ip) {
        cache.clear();
        if (req == null) throw ApiException.badRequest("Department and semester are required");
        String deptKey = departments.key(req.deptKey());
        int sem = Semesters.parse(req.semester());
        String assessment = MarkService.assessment(req.assessmentType());
        String reason = req.reason() == null ? "" : req.reason().trim();
        if (reason.length() < 5 || reason.length() > 300) {
            throw ApiException.badRequest("Give the reason for withdrawing the results (5 to 300 characters)");
        }
        List<String> codes = db.sql("""
                        SELECT subject_code FROM result_batches
                        WHERE dept_key = ? AND semester = ? AND assessment_type = ? AND status = 'PUBLISHED'
                        ORDER BY subject_code
                        """)
                .params(deptKey, sem, assessment).query(String.class).list();
        int hidden = db.sql("""
                        UPDATE result_batches SET status = 'WITHDRAWN', withdrawn_by = ?, withdrawn_at = now(),
                                                  withdraw_reason = ?
                        WHERE dept_key = ? AND semester = ? AND assessment_type = ? AND status = 'PUBLISHED'
                        """)
                .params(user.name() + " (" + user.username() + ")", reason, deptKey, sem, assessment).update();
        if (hidden == 0) throw ApiException.conflict("Nothing is published for this department, semester and assessment.");
        audit.record(user.username(), user.name(), "WITHDREW_DEPARTMENT_RESULTS",
                deptKey.toUpperCase(Locale.ROOT) + " " + Semesters.label(sem) + " " + assessment,
                "Withdrew " + hidden + " subjects from the student and HOD portals. Reason: " + reason, ip,
                "PUBLISHED: " + String.join(", ", codes), "WITHDRAWN: " + reason);
        notifications.notify(Audience.STUDENT, deptKey, sem, Semesters.label(sem) + " " + assessment + " results withdrawn",
                "Your " + Semesters.label(sem) + " " + assessment + " results were withdrawn for review. They will be published again.",
                null);
        for (Audience staff : new Audience[] {Audience.HOD, Audience.FACULTY}) {
            notifications.notify(staff, deptKey, sem,
                    deptKey.toUpperCase(Locale.ROOT) + " " + Semesters.label(sem) + " " + assessment + " results withdrawn",
                    "The Controller of Examinations withdrew " + hidden + " subjects; marks can be corrected and "
                            + "forwarded again.", null);
        }
        return hidden;
    }

    /**
     * Faculty forwards one subject's entered marks to the COE: a VALIDATED snapshot replaces the subject's earlier
     * forwarded batch. Refused once the department's results are published (the COE must unpublish first).
     */
    @Transactional
    public ResultBatch forward(ForwardRequest req, CurrentUser user, String ip) {
        if (req == null || req.subjectCode() == null || req.subjectCode().isBlank()) {
            throw ApiException.badRequest("Department, semester and subject are required");
        }
        String deptKey = departments.key(req.deptKey());
        if (user.role() == CurrentUser.Role.FACULTY && !deptKey.equals(user.deptKey())) {
            throw new ApiException(org.springframework.http.HttpStatus.FORBIDDEN,
                    "You can only forward marks for your own department.");
        }
        int sem = Semesters.parse(req.semester());
        String code = req.subjectCode().trim().toUpperCase(Locale.ROOT);
        String assessment = MarkService.assessment(req.assessmentType());
        int entered = db.sql("""
                        SELECT count(*) FROM marks WHERE dept_key = ? AND semester = ? AND subject_code = ?
                          AND assessment_type = ?
                        """)
                .params(deptKey, sem, code, assessment).query(Integer.class).single();
        if (entered == 0) {
            throw ApiException.conflict("Enter " + assessment + " marks for at least one student before forwarding.");
        }
        int published = db.sql("""
                        SELECT count(*) FROM result_batches WHERE dept_key = ? AND semester = ? AND assessment_type = ?
                          AND status = 'PUBLISHED'
                        """)
                .params(deptKey, sem, assessment).query(Integer.class).single();
        if (published > 0) {
            throw ApiException.conflict(assessment + " results for this department are already published. Ask the "
                    + "Controller of Examinations to unpublish them before forwarding changed marks.");
        }
        String academicYear = req.academicYear() == null || req.academicYear().isBlank() ? "2026 - 2027"
                : req.academicYear().trim();
        String exam = "End Semester".equals(assessment) ? "Nov / Dec 2026" : assessment + " (Internal Assessment)";
        ResultBatch batch = commitSubject(deptKey, sem, code, assessment, academicYear, exam, "VALIDATED", user);
        audit.record(user.username(), user.name(), "FORWARDED_MARKS_TO_COE", batch.id() + " (" + code + ")",
                "Forwarded " + assessment + " marks of " + batch.totalStudents() + " students in " + code + " " + batch.subjectTitle()
                        + " to the Controller of Examinations for verification.", ip);
        String what = deptKey.toUpperCase(Locale.ROOT) + " " + code + " " + assessment + " (" + Semesters.label(sem) + ")";
        String body = user.name() + " forwarded " + assessment + " marks of " + batch.totalStudents() + " students in " + code + " "
                + batch.subjectTitle() + " for verification.";
        notifications.notify(Audience.COE, deptKey, sem, "Marks forwarded: " + what, body + " Review on Publish Results.",
                "/admin/results/publish");
        notifications.notify(Audience.HOD, deptKey, sem, "Marks forwarded: " + what, body, null);
        return batch;
    }

    /** "Approve & Publish" on one forwarded subject publishes its whole department and semester. */
    @Transactional
    public PublishSummary publishBatch(String id, CurrentUser user, String ip) {
        BatchRow batch = row(id);
        return publishDepartment(new PublishRequest(batch.deptKey(), Semesters.label(batch.semester()),
                batch.academicYear(), batch.examMonthYear(), batch.assessmentType(), null), user, ip);
    }

    /** Deletes an unpublished batch. A published one must be withdrawn with the whole department first. */
    @Transactional
    public void delete(String id, CurrentUser user, String ip) {
        cache.clear();
        BatchRow batch = row(id);
        if ("PUBLISHED".equals(batch.status())) {
            throw ApiException.conflict("Unpublish this department's results first; a published subject cannot be deleted on its own.");
        }
        db.sql("DELETE FROM result_batches WHERE id = ?").param(id).update();
        audit.record(user.username(), user.name(), "DELETED_RESULT", id + " (" + batch.title() + ")",
                "Deleted a " + batch.status().toLowerCase(Locale.ROOT) + " result batch.", ip);
    }

    /** "Delete Target Semester": every batch of one department and semester. */
    @Transactional
    public int deleteForSemester(String dept, String semester, String subject, CurrentUser user, String ip) {
        cache.clear();
        String deptKey = departments.key(dept);
        int sem = Semesters.parse(semester);
        String code = subject == null || subject.isBlank() ? null : subject.trim().toUpperCase(Locale.ROOT);
        if (db.sql("""
                        SELECT count(*) FROM result_batches WHERE dept_key = ? AND semester = ? AND status = 'PUBLISHED'
                          AND (CAST(? AS VARCHAR) IS NULL OR subject_code = ?)
                        """)
                .params(deptKey, sem, code, code).query(Integer.class).single() > 0) {
            throw ApiException.conflict("Unpublish this department's results before deleting them.");
        }
        int deleted = db.sql("""
                        DELETE FROM result_batches WHERE dept_key = ? AND semester = ?
                          AND (CAST(? AS VARCHAR) IS NULL OR subject_code = ?)
                        """)
                .params(deptKey, sem, code, code).update();
        audit.record(user.username(), user.name(), "DELETED_TARGET_SEMESTER_DATA",
                deptKey.toUpperCase(Locale.ROOT) + " - " + Semesters.label(sem),
                "Deleted " + deleted + " result batches.", ip);
        return deleted;
    }

    @Transactional
    public int deleteAll(CurrentUser user, String ip) {
        cache.clear();
        int deleted = db.sql("DELETE FROM result_batches WHERE status <> 'PUBLISHED' AND "
                + departments.inCollege("dept_key")).update();
        audit.record(user.username(), user.name(), "CLEARED_ALL_RESULTS", "All result batches",
                "Deleted all " + deleted + " result batches.", ip);
        return deleted;
    }

    public ResultBatch get(String id) {
        return assemble(List.of(row(id))).getFirst();
    }

    /** Every PUBLISHED batch of one department, with its student records (the faculty "download results" view). */
    public List<ResultBatch> publishedForDepartment(String deptKey) {
        return assemble(rows("WHERE b.dept_key = ? AND b.status = 'PUBLISHED' "
                + "ORDER BY b.semester, b.assessment_type, b.subject_code", new Object[] {deptKey}));
    }

    /** Every result batch of one department, forwarded or published (HOD analytics). */
    public List<ResultBatch> listForDepartment(String deptKey) {
        return assemble(rows("WHERE b.dept_key = ? ORDER BY b.uploaded_at DESC", new Object[] {deptKey}));
    }

    public List<ResultBatch> list() {
        return assemble(rows("WHERE " + departments.inCollege("b.dept_key") + " ORDER BY b.uploaded_at DESC",
                new Object[0]));
    }

    public DashboardStats dashboard() {
        String scope = departments.inCollege("dept_key");
        int students = count("SELECT count(*) FROM students WHERE " + scope);
        int withoutDob = count("SELECT count(*) FROM students WHERE dob IS NULL AND " + scope);
        int marksEntered = count("SELECT count(*) FROM marks WHERE " + scope);
        int faculty = count("SELECT count(*) FROM users WHERE role IN ('HOD', 'FACULTY') AND enabled AND " + scope);
        int departmentsInUse = count("SELECT count(*) FROM departments WHERE college_key = '"
                + departments.college() + "'");
        int courses = count("SELECT count(*) FROM subjects WHERE " + scope);
        int pending = count("SELECT count(*) FROM result_batches WHERE status <> 'PUBLISHED' AND " + scope);
        int published = count("SELECT count(*) FROM result_batches WHERE status = 'PUBLISHED' AND " + scope);
        // A student passes when none of their published subject results is a fail.
        Map<String, Object> pass = db.sql("""
                        SELECT count(*) AS total, count(*) FILTER (WHERE NOT failed) AS passed FROM (
                            SELECT r.reg_no, bool_or(NOT r.passed) AS failed
                            FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                            WHERE b.status = 'PUBLISHED' AND """ + departments.inCollege("b.dept_key") + """
                            GROUP BY r.reg_no) s
                        """)
                .query().singleRow();
        double overall = percent(((Number) pass.get("passed")).intValue(), ((Number) pass.get("total")).intValue());
        List<RecentUpload> recent = list().stream().limit(5)
                .map(b -> new RecentUpload(b.id(), b.departmentName(), b.semester(), b.totalStudents(),
                        b.publicationStatus(), b.uploadDate()))
                .toList();
        return new DashboardStats(students, withoutDob, marksEntered, faculty, departmentsInUse, courses, pending,
                published,
                overall, recent, departmentRows());
    }

    private record MissingMarks(String subjectCode, int students) {
    }

    /**
     * Results are released only when the whole department-semester is marked: every subject in the catalog must have
     * marks for every student. Otherwise students would see partial results and a misleading SGPA.
     */
    private void requireAllMarksEntered(String deptKey, int semester, String assessment) {
        int students = db.sql("SELECT count(*) FROM students WHERE dept_key = ? AND semester = ?")
                .params(deptKey, semester).query(Integer.class).single();
        if (students == 0) {
            throw ApiException.conflict("Cannot publish: there are no students in this department and semester.");
        }
        List<MissingMarks> missing = db.sql("""
                        SELECT j.code, (SELECT count(*) FROM students s
                                        WHERE s.dept_key = j.dept_key AND s.semester = j.semester)
                                     - (SELECT count(*) FROM marks m
                                        JOIN students s ON s.reg_no = m.reg_no
                                                       AND s.dept_key = j.dept_key AND s.semester = j.semester
                                        WHERE m.dept_key = j.dept_key AND m.semester = j.semester
                                          AND m.subject_code = j.code AND m.assessment_type = ?) AS missing
                        FROM subjects j WHERE j.dept_key = ? AND j.semester = ?
                        ORDER BY j.code
                        """)
                .params(assessment, deptKey, semester)
                .query((rs, n) -> new MissingMarks(rs.getString("code"), rs.getInt("missing")))
                .list().stream().filter(m -> m.students() > 0).toList();
        if (missing.isEmpty()) return;
        String detail = missing.stream().limit(6)
                .map(m -> m.subjectCode() + " (" + m.students() + " student" + (m.students() == 1 ? "" : "s") + ")")
                .collect(java.util.stream.Collectors.joining(", "));
        if (missing.size() > 6) detail += " and " + (missing.size() - 6) + " more subjects";
        throw ApiException.conflict("Cannot publish yet: " + assessment + " marks are missing for " + detail
                + ". Enter marks for every student in every subject first.");
    }

    /**
     * Faculty must forward every subject before the COE can publish, and a subject whose marks changed after it was
     * forwarded must be forwarded again, so the COE publishes exactly what was verified.
     */
    private void requireAllForwarded(String deptKey, int semester, String assessment) {
        List<PublishRow> rows = publishStatus(deptKey, Semesters.label(semester), assessment);
        List<String> notForwarded = rows.stream()
                .filter(r -> r.state().equals("NOT_FORWARDED") || r.state().equals("NO_MARKS"))
                .map(PublishRow::subjectCode).toList();
        List<String> changed = rows.stream().filter(r -> r.state().equals("OUT_OF_DATE"))
                .map(PublishRow::subjectCode).toList();
        if (!notForwarded.isEmpty()) {
            throw ApiException.conflict("Cannot publish yet: faculty have not forwarded "
                    + String.join(", ", notForwarded) + " to the Controller of Examinations.");
        }
        if (!changed.isEmpty()) {
            throw ApiException.conflict("Cannot publish yet: marks for " + String.join(", ", changed)
                    + " changed after they were forwarded. They must be forwarded again.");
        }
    }

    /** Every catalog subject of a department and semester with its publication state for one assessment. */
    public List<PublishRow> publishStatus(String dept, String semester, String assessmentType) {
        String deptKey = departments.key(dept);
        int sem = Semesters.parse(semester);
        String assessment = MarkService.assessment(assessmentType);
        return db.sql("""
                        SELECT j.code, j.title,
                               (SELECT count(*) FROM students s
                                WHERE s.dept_key = j.dept_key AND s.semester = j.semester) AS students,
                               (SELECT count(*) FROM marks m WHERE m.dept_key = j.dept_key
                                AND m.semester = j.semester AND m.subject_code = j.code
                                AND m.assessment_type = :assessment) AS marks_entered,
                               (SELECT max(m.entered_at) FROM marks m WHERE m.dept_key = j.dept_key
                                AND m.semester = j.semester AND m.subject_code = j.code
                                AND m.assessment_type = :assessment) AS last_mark_at,
                               b.id AS batch_id, b.status, b.forwarded_at AS committed_at, b.published_at,
                               b.forwarded_by,
                               (SELECT count(*) FROM result_records r WHERE r.batch_id = b.id) AS records,
                               (SELECT count(*) FROM result_records r WHERE r.batch_id = b.id AND r.passed) AS passed
                        FROM subjects j
                        LEFT JOIN result_batches b ON b.dept_key = j.dept_key AND b.semester = j.semester
                                                  AND b.subject_code = j.code AND b.assessment_type = :assessment
                        WHERE j.dept_key = :dept AND j.semester = :sem
                        ORDER BY j.code
                        """)
                .param("assessment", assessment).param("dept", deptKey).param("sem", sem)
                .query((rs, n) -> {
                    int marks = rs.getInt("marks_entered");
                    String batchId = rs.getString("batch_id");
                    String status = rs.getString("status");
                    OffsetDateTime lastMark = rs.getObject("last_mark_at", OffsetDateTime.class);
                    OffsetDateTime committed = rs.getObject("committed_at", OffsetDateTime.class);
                    String state;
                    if (batchId == null) state = marks == 0 ? "NO_MARKS" : "NOT_FORWARDED";
                    else if (lastMark != null && committed != null && lastMark.isAfter(committed)) state = "OUT_OF_DATE";
                    else if ("WITHDRAWN".equals(status)) state = "WITHDRAWN";
                    else state = "PUBLISHED".equals(status) ? "PUBLISHED" : "FORWARDED";
                    int records = rs.getInt("records");
                    return new PublishRow(rs.getString("code"), rs.getString("title"), rs.getInt("students"), marks,
                            state, batchId, Semesters.display(rs.getObject("published_at", OffsetDateTime.class)),
                            records, percent(rs.getInt("passed"), records), rs.getString("forwarded_by"));
                }).list();
    }

    /** Departments that have students or subjects, with their live counts. */
    private List<DepartmentRow> departmentRows() {
        Map<String, double[]> pass = new LinkedHashMap<>(); // dept -> {students with results, students who passed}
        db.sql("""
                        SELECT dept_key, count(*) AS total, count(*) FILTER (WHERE NOT failed) AS passed FROM (
                            SELECT b.dept_key, r.reg_no, bool_or(NOT r.passed) AS failed
                            FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                            WHERE b.status = 'PUBLISHED' AND """ + departments.inCollege("b.dept_key") + """
                            GROUP BY b.dept_key, r.reg_no) x
                        GROUP BY dept_key
                        """)
                .query((rs, n) -> {
                    pass.put(rs.getString("dept_key"), new double[] {rs.getInt("total"), rs.getInt("passed")});
                    return null;
                }).list();
        return db.sql("""
                        SELECT d.dept_key, d.name,
                               (SELECT count(*) FROM students s WHERE s.dept_key = d.dept_key) AS students,
                               (SELECT count(*) FROM students s WHERE s.dept_key = d.dept_key AND s.dob IS NULL) AS no_dob,
                               (SELECT count(*) FROM subjects j WHERE j.dept_key = d.dept_key) AS subjects,
                               (SELECT count(*) FROM marks m WHERE m.dept_key = d.dept_key) AS marks,
                               (SELECT count(*) FROM result_batches b
                                WHERE b.dept_key = d.dept_key AND b.status = 'PUBLISHED') AS published
                        FROM departments d
                        WHERE d.college_key = ?
                        ORDER BY d.name
                        """)
                .param(departments.college())
                .query((rs, n) -> {
                    double[] p = pass.get(rs.getString("dept_key"));
                    return new DepartmentRow(rs.getString("dept_key"), rs.getString("name"), rs.getInt("students"),
                            rs.getInt("no_dob"), rs.getInt("subjects"), rs.getInt("marks"), rs.getInt("published"),
                            p == null ? 0 : percent((int) p[1], (int) p[0]));
                }).list();
    }

    private BatchRow row(String id) {
        List<BatchRow> found = rows("WHERE b.id = ? AND " + departments.inCollege("b.dept_key"),
                new Object[] {id});
        if (found.isEmpty()) throw ApiException.notFound("Result batch not found");
        return found.getFirst();
    }

    private List<BatchRow> rows(String clause, Object[] params) {
        return db.sql("""
                        SELECT b.id, b.title, b.dept_key, d.name AS dept_name, b.semester, b.academic_year,
                               b.exam_month_year, b.subject_code, b.subject_title, b.status, b.uploaded_by,
                               b.uploaded_at, b.published_by, b.published_at, b.assessment_type
                        FROM result_batches b JOIN departments d ON d.dept_key = b.dept_key
                        """ + clause)
                .params(params)
                .query((rs, n) -> new BatchRow(rs.getString("id"), rs.getString("title"), rs.getString("dept_key"),
                        rs.getString("dept_name"), rs.getInt("semester"), rs.getString("academic_year"),
                        rs.getString("exam_month_year"), rs.getString("subject_code"), rs.getString("subject_title"),
                        rs.getString("status"), rs.getString("uploaded_by"),
                        rs.getObject("uploaded_at", OffsetDateTime.class), rs.getString("published_by"),
                        rs.getObject("published_at", OffsetDateTime.class), rs.getString("assessment_type")))
                .list();
    }

    private List<ResultBatch> assemble(List<BatchRow> batches) {
        if (batches.isEmpty()) return List.of();
        Map<String, BatchRow> byId = new LinkedHashMap<>();
        Map<String, List<RecordItem>> records = new LinkedHashMap<>();
        batches.forEach(b -> {
            byId.put(b.id(), b);
            records.put(b.id(), new ArrayList<>());
        });
        db.sql("""
                        SELECT r.batch_id, r.reg_no, s.name, r.credits, r.part_a_total, r.part_bc_total, r.total,
                               r.grade, r.grade_points, r.passed, r.assessment_type
                        FROM result_records r JOIN students s ON s.reg_no = r.reg_no
                        WHERE r.batch_id IN (:ids)
                        ORDER BY (s.category = 'lateral'), r.reg_no
                        """)
                .param("ids", new ArrayList<>(records.keySet()))
                .query((rs, n) -> {
                    BatchRow b = byId.get(rs.getString("batch_id"));
                    records.get(b.id()).add(new RecordItem(rs.getString("reg_no"), rs.getString("name"), b.deptKey(),
                            b.subjectCode(), b.subjectTitle(), rs.getInt("credits"), Semesters.label(b.semester()),
                            rs.getBigDecimal("part_a_total"), rs.getBigDecimal("part_bc_total"), rs.getInt("total"),
                            rs.getString("grade"), rs.getInt("grade_points"), rs.getBoolean("passed") ? "PASS" : "FAIL",
                            rs.getString("assessment_type")));
                    return null;
                })
                .list();

        return batches.stream().map(b -> {
            List<RecordItem> items = records.get(b.id());
            int total = items.size();
            int passed = (int) items.stream().filter(r -> "PASS".equals(r.resultStatus())).count();
            return new ResultBatch(b.id(), b.title(), b.deptKey(), b.deptName(), Semesters.label(b.semester()),
                    b.semester(), b.academicYear(), b.examMonthYear(), b.subjectCode(), b.subjectTitle(),
                    Semesters.display(b.uploadedAt()), b.uploadedBy(), total, passed, percent(passed, total),
                    b.status(), Semesters.display(b.publishedAt()), b.publishedBy(), items, b.assessmentType());
        }).toList();
    }

    private int count(String sql) {
        return db.sql(sql).query(Integer.class).single();
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }

    static double percent(int part, int whole) {
        if (whole == 0) return 0;
        return BigDecimal.valueOf(part * 100.0 / whole).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
