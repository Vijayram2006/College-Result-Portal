package edu.kvell.results.mentoring;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Departments;
import edu.kvell.results.erp.ErpSupport;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Mentoring. The HOD allots each student of the department a faculty mentor, by hand or automatically (each save is a
 * batch); the Associate Dean approves or returns the allotment, and only approved mentors see their mentees. Mentors
 * record sessions and answer the concerns their mentees raise (or escalate them to the HOD). A student may ask for a
 * change of mentor; the HOD reassigns, retains or closes it.
 */
@RestController
@RequestMapping("/api/mentoring")
public class MentoringController {

    static final Set<String> CONCERN_STATUSES = Set.of("SUBMITTED", "IN_REVIEW", "RESOLVED", "ESCALATED_TO_HOD");

    public record Activity(long id, String activityType, String title, String organization, String achievement,
                           String academicYear, String eventDate) {
    }

    public record MentorInfo(long facultyId, String name, String username, String department, String email, String phone,
                             String cabin) {
    }

    public record Mentee(String regNo, String name, String category, String yearLabel, int semester, String deptKey,
                         String academicYear, String lastSessionDate, int pendingConcerns, int arrearsCount,
                         String arrearSubjects, double attendancePct, double iaAverage, List<Activity> activities) {
    }

    public record SessionView(long id, long facultyId, String facultyName, String studentRegNo, String studentName,
                              String sessionDate, String sessionType, String meetingMode, String topicsDiscussed,
                              String guidanceNotes, String actionItems, String nextReviewDate, String attendanceStatus,
                              String createdAt) {
    }

    public record ConcernView(long id, String studentRegNo, String studentName, Long facultyId, String facultyName,
                              String title, String category, String description, String status, String mentorResponse,
                              String hodRemarks, String createdAt, String updatedAt) {
    }

    public record StudentDashboard(MentorInfo mentor, List<SessionView> sessions, List<ConcernView> concerns,
                                   String allocationStatus, String approvalMessage) {
    }

    public record MentorStat(long facultyId, String name, String username, int menteeCount, int sessionsCount,
                             int pendingCount) {
    }

    public record HodOverview(String deptKey, int totalMentees, int totalMentors, int totalSessions, int activeConcerns,
                              int escalatedConcerns, List<MentorStat> mentors, int pendingApprovals, int rejectedCount) {
    }

    public record CollegeOverview(String collegeKey, int totalStudents, int totalAllocated, int totalMentors,
                                  int totalSessions, int pendingConcerns, int pendingApprovals,
                                  List<HodOverview> departmentBreakdown) {
    }

    public record AllocationDetail(long id, String studentRegNo, String studentName, int semester, long facultyId,
                                   String facultyName, String facultyUsername, String status, String academicYear,
                                   String assignedBy, String adeanRemarks, String createdAt, String approvedAt) {
    }

    public record EligibleStudent(String regNo, String name, String deptKey, int semester, String yearLabel,
                                  Long facultyId, String facultyName, Long currentFacultyId, String currentFacultyName,
                                  String allocationStatus) {
    }

    public record FacultyOption(long id, String name, String username, int activeCount, int pendingCount,
                                int activeMenteeCount, int pendingMenteeCount) {
    }

    public record PendingAllocation(long id, String studentRegNo, String studentName, String deptKey, int semester,
                                    long facultyId, String facultyName, String facultyUsername, String academicYear,
                                    String assignedBy, String status, String batchId, String createdAt) {
    }

    public record ReviewResult(int approvedCount, int rejectedCount, String message) {
    }

    public record PendingBatch(String batchId, String deptKey, String academicYear, String assignedBy, int studentCount,
                               int totalStudents, int facultyCount, String createdAt, List<PendingAllocation> allocations) {
    }

    public record Pair(String studentRegNo, Long facultyId) {
    }

    public record AllocateRequest(String deptKey, String academicYear, List<Pair> allocations) {
    }

    public record AutoAllocateRequest(String deptKey, String academicYear, Integer semester, String strategy) {
    }

    public record AutoAllocateResult(int totalAllocated, int facultyCount, String batchId, String message,
                                     List<Pair> allocations) {
    }

    public record ReviewAllocationsRequest(List<Long> allocationIds, String action, String remarks) {
    }

    public record BatchReviewRequest(String batchId, String action, String remarks) {
    }

    public record SessionRequest(String studentRegNo, String sessionDate, String sessionType, String meetingMode,
                                 String topicsDiscussed, String guidanceNotes, String actionItems, String nextReviewDate) {
    }

    public record ConcernRequest(String title, String category, String description) {
    }

    public record ConcernUpdate(String status, String mentorResponse, String hodRemarks) {
    }

    public record ChangeRequest(String reason, String queriesAboutMentor, String preferredMentorNotes) {
    }

    public record Escalated(long id, String studentRegNo, String studentName, String deptKey, int semester,
                            Long currentFacultyId, String currentFacultyName, String title, String reason, String category,
                            String description, String queriesAboutMentor, String preferredMentorNotes, String status,
                            String mentorResponse, String hodRemarks, String createdAt, String escalatedAt) {
    }

    public record ResolveRequest(Long concernId, String action, Long newFacultyId, String hodRemarks) {
    }

    public record SubjectMark(String subjectCode, String subjectTitle, String component, double value) {
    }

    public record Profile(String regNo, String name, String deptKey, int semester, String yearLabel, String email,
                          String phone, int arrearsCount, List<String> arrearSubjectList, double attendancePct,
                          int totalClasses, int attendedClasses, int absentClasses, double iaAverage,
                          List<SubjectMark> subjectMarks, List<Activity> extracurricularActivities,
                          List<SessionView> sessions, List<ConcernView> concerns) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final NotificationService notifications;

    public MentoringController(JdbcClient db, Departments departments, NotificationService notifications) {
        this.db = db;
        this.departments = departments;
        this.notifications = notifications;
    }

    // ---------------------------------------------------------------- student

    @GetMapping("/student/my-mentor")
    StudentDashboard myMentor() {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        Map<String, Object> a = allocationOf(me.regNo());
        MentorInfo mentor = null;
        String status = "UNASSIGNED";
        String message = "A mentor has not been allotted to you yet. Your HOD allots mentors at the start of the year.";
        if (a != null) {
            status = (String) a.get("status");
            switch (status) {
                case "APPROVED" -> {
                    mentor = mentorInfo(((Number) a.get("faculty_user_id")).longValue());
                    message = "Your mentor is approved by the Associate Dean.";
                }
                case "PENDING_ADEAN_APPROVAL" -> message = "Your HOD has allotted a mentor; it is waiting for the Associate Dean's approval.";
                default -> message = "Your mentor allotment was returned by the Associate Dean; the HOD will allot again.";
            }
        }
        return new StudentDashboard(mentor, sessionsWhere("s.reg_no = ?", me.regNo()), concernsWhere("c.reg_no = ?", me.regNo()),
                status, message);
    }

    @PostMapping("/student/mentor-change-request")
    @Transactional
    ConcernView mentorChange(@RequestBody ChangeRequest req) {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        if (req == null || req.reason() == null || req.reason().isBlank()) throw ApiException.badRequest("Give the reason for the change");
        Map<String, Object> a = allocationOf(me.regNo());
        if (a == null || !"APPROVED".equals(a.get("status"))) throw ApiException.badRequest("You have no approved mentor to change");
        int open = db.sql("SELECT count(*) FROM mentoring_concerns WHERE reg_no = ? AND category = 'MENTOR_CHANGE' AND status <> 'RESOLVED'")
                .param(me.regNo()).query(Integer.class).single();
        if (open > 0) throw ApiException.conflict("You already have a mentor change request with the HOD");
        String desc = "Mentor change requested: " + req.reason().trim()
                + (blank(req.queriesAboutMentor()) ? "" : "\n" + req.queriesAboutMentor().trim());
        long id = db.sql("""
                        INSERT INTO mentoring_concerns (reg_no, faculty_user_id, title, category, description, status, reason,
                                                        queries_about_mentor, preferred_mentor_notes, escalated_at)
                        VALUES (?, ?, 'Mentor change request', 'MENTOR_CHANGE', ?, 'ESCALATED_TO_HOD', ?, ?, ?, now()) RETURNING id
                        """)
                .params(me.regNo(), a.get("faculty_user_id"), clip(desc, 2000), clip(req.reason().trim(), 200),
                        nul(req.queriesAboutMentor(), 2000), nul(req.preferredMentorNotes(), 1000))
                .query(Long.class).single();
        notifications.notify(Audience.HOD, me.deptKey(), null, "Mentor change request",
                me.name() + " (" + me.regNo() + ") asked for a change of mentor. Open Mentoring System to decide.", "mentoring");
        return concern(id);
    }

    // ---------------------------------------------------------------- faculty (mentors)

    @GetMapping("/faculty/mentees")
    List<Mentee> mentees() {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        List<String> regs = db.sql("SELECT reg_no FROM mentor_allocations WHERE faculty_user_id = ? AND status = 'APPROVED' ORDER BY reg_no")
                .param(me.id()).query(String.class).list();
        List<Mentee> out = new ArrayList<>();
        for (String reg : regs) {
            Map<String, Object> s = db.sql("SELECT name, category, year_label, semester, dept_key, academic_year FROM students WHERE reg_no = ?")
                    .param(reg).query().singleRow();
            String last = db.sql("SELECT max(session_date)::text FROM mentoring_sessions WHERE reg_no = ?").param(reg)
                    .query(String.class).optional().orElse(null);
            int pending = db.sql("SELECT count(*) FROM mentoring_concerns WHERE reg_no = ? AND status IN ('SUBMITTED', 'IN_REVIEW')")
                    .param(reg).query(Integer.class).single();
            List<String> arrears = arrears(reg);
            int[] att = attendance(reg);
            out.add(new Mentee(reg, (String) s.get("name"), (String) s.get("category"), (String) s.get("year_label"),
                    num(s.get("semester")), (String) s.get("dept_key"), (String) s.get("academic_year"), last, pending,
                    arrears.size(), String.join(", ", arrears), pct(att[1], att[0]), iaAverage(reg), activities(reg)));
        }
        return out;
    }

    @GetMapping("/sessions")
    List<SessionView> sessions(@RequestParam(required = false) String studentRegNo) {
        CurrentUser me = CurrentUser.get();
        String reg = blank(studentRegNo) ? null : studentRegNo;
        return switch (me.role()) {
            case STUDENT -> sessionsWhere("s.reg_no = ?", me.regNo());
            case FACULTY -> reg == null ? sessionsWhere("s.faculty_user_id = ?", me.id())
                    : sessionsWhere("s.faculty_user_id = ? AND s.reg_no = ?", me.id(), reg);
            case HOD -> reg == null ? sessionsWhere("st.dept_key = ?", me.deptKey())
                    : sessionsWhere("st.dept_key = ? AND s.reg_no = ?", me.deptKey(), reg);
            case DEAN -> reg == null ? sessionsWhere(departments.inCollege("st.dept_key") + " AND TRUE")
                    : sessionsWhere(departments.inCollege("st.dept_key") + " AND s.reg_no = ?", reg);
            default -> throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this");
        };
    }

    @PostMapping("/sessions")
    @Transactional
    SessionView recordSession(@RequestBody SessionRequest req) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        if (req == null || blank(req.studentRegNo()) || blank(req.topicsDiscussed()) || blank(req.guidanceNotes())) {
            throw ApiException.badRequest("Fill in the student, the topics discussed and the guidance given");
        }
        requireMentor(me, req.studentRegNo());
        LocalDate date = blank(req.sessionDate()) ? ErpSupport.today() : LocalDate.parse(req.sessionDate());
        if (date.isAfter(ErpSupport.today())) throw ApiException.badRequest("The session date is in the future");
        LocalDate next = blank(req.nextReviewDate()) ? null : LocalDate.parse(req.nextReviewDate());
        long id = db.sql("""
                        INSERT INTO mentoring_sessions (faculty_user_id, reg_no, session_date, session_type, meeting_mode,
                                                        topics_discussed, guidance_notes, action_items, next_review_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                        """)
                .params(me.id(), req.studentRegNo(), date, upper(req.sessionType(), "ACADEMIC"), upper(req.meetingMode(), "IN_PERSON"),
                        clip(req.topicsDiscussed().trim(), 1000), clip(req.guidanceNotes().trim(), 2000),
                        nul(req.actionItems(), 1000), next)
                .query(Long.class).single();
        notifications.notifyUser(studentUser(req.studentRegNo()), Audience.STUDENT, null, null, "Mentoring session recorded",
                "Your mentor " + me.name() + " recorded the session of " + date + ". Open My Mentor to see the guidance.", "mentoring");
        return sessionsWhere("s.id = ?", id).get(0);
    }

    @GetMapping("/concerns")
    List<ConcernView> concerns(@RequestParam(required = false) String status) {
        CurrentUser me = CurrentUser.get();
        String st = blank(status) || "ALL".equalsIgnoreCase(status) ? null : status.toUpperCase(Locale.ROOT);
        String filter = st == null ? "" : " AND c.status = '" + checkStatus(st) + "'";
        return switch (me.role()) {
            case STUDENT -> concernsWhere("c.reg_no = ?" + filter, me.regNo());
            case FACULTY -> concernsWhere("c.faculty_user_id = ?" + filter, me.id());
            case HOD -> concernsWhere("st.dept_key = ?" + filter, me.deptKey());
            case DEAN -> concernsWhere(departments.inCollege("st.dept_key") + filter);
            default -> throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this");
        };
    }

    @PostMapping("/concerns")
    @Transactional
    ConcernView raiseConcern(@RequestBody ConcernRequest req) {
        CurrentUser me = ErpSupport.require(Role.STUDENT);
        if (req == null || blank(req.title()) || blank(req.description())) throw ApiException.badRequest("Give a title and describe the concern");
        Map<String, Object> a = allocationOf(me.regNo());
        Long mentor = a != null && "APPROVED".equals(a.get("status")) ? ((Number) a.get("faculty_user_id")).longValue() : null;
        long id = db.sql("""
                        INSERT INTO mentoring_concerns (reg_no, faculty_user_id, title, category, description, status, escalated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
                        """)
                .params(me.regNo(), mentor, clip(req.title().trim(), 200), upper(req.category(), "ACADEMIC"),
                        clip(req.description().trim(), 2000), mentor == null ? "ESCALATED_TO_HOD" : "SUBMITTED",
                        mentor == null ? OffsetDateTime.now() : null)
                .query(Long.class).single();
        if (mentor != null) {
            notifications.notifyUser(mentor, Audience.FACULTY, me.deptKey(), null, "Concern from your mentee",
                    me.name() + " (" + me.regNo() + ") raised a concern: " + req.title().trim() + ". Open Mentoring to answer it.", "mentoring");
        } else {
            notifications.notify(Audience.HOD, me.deptKey(), null, "Student concern",
                    me.name() + " (" + me.regNo() + ") raised a concern (no mentor yet): " + req.title().trim(), "mentoring");
        }
        return concern(id);
    }

    /** The mentor answers (in review, resolved, or escalated to the HOD); the HOD adds remarks or closes it. */
    @PutMapping("/concerns/{id}")
    @Transactional
    ConcernView updateConcern(@PathVariable long id, @RequestBody ConcernUpdate req) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        Map<String, Object> c = db.sql("""
                        SELECT c.*, st.dept_key FROM mentoring_concerns c JOIN students st ON st.reg_no = c.reg_no WHERE c.id = ?
                        """).param(id).query().listOfRows().stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Concern not found"));
        boolean hod = me.role() == Role.HOD && me.deptKey().equals(c.get("dept_key"));
        boolean mentor = c.get("faculty_user_id") != null && ((Number) c.get("faculty_user_id")).longValue() == me.id();
        if (!hod && !mentor) throw new ApiException(HttpStatus.FORBIDDEN, "This concern is not of your mentee");
        String status = blank(req.status()) ? (String) c.get("status") : checkStatus(req.status().toUpperCase(Locale.ROOT));
        if ("RESOLVED".equals(c.get("status")) && !hod) throw ApiException.conflict("This concern is already resolved");
        db.sql("""
                        UPDATE mentoring_concerns SET status = ?, mentor_response = coalesce(?, mentor_response),
                               hod_remarks = coalesce(?, hod_remarks), updated_at = now(),
                               escalated_at = CASE WHEN ? = 'ESCALATED_TO_HOD' AND escalated_at IS NULL THEN now() ELSE escalated_at END
                        WHERE id = ?
                        """)
                .params(status, mentor ? nul(req.mentorResponse(), 2000) : null, hod ? nul(req.hodRemarks(), 2000) : null, status, id)
                .update();
        String reg = (String) c.get("reg_no");
        notifications.notifyUser(studentUser(reg), Audience.STUDENT, null, null, "Concern updated",
                "Your concern \"" + c.get("title") + "\" is now " + status.replace('_', ' ').toLowerCase(Locale.ROOT) + ".", "mentoring");
        if ("ESCALATED_TO_HOD".equals(status) && !"ESCALATED_TO_HOD".equals(c.get("status"))) {
            notifications.notify(Audience.HOD, (String) c.get("dept_key"), null, "Concern escalated by a mentor",
                    me.name() + " escalated a concern of " + reg + ": " + c.get("title"), "mentoring");
        }
        return concern(id);
    }

    @GetMapping("/mentee-profile/{regNo}")
    Profile profile(@PathVariable String regNo) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD, Role.DEAN);
        Map<String, Object> s = db.sql("SELECT name, dept_key, semester, year_label, coalesce(parent_phone, '') AS phone FROM students WHERE reg_no = ?")
                .param(regNo).query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("Student not found"));
        String dept = (String) s.get("dept_key");
        switch (me.role()) {
            case FACULTY -> requireMentor(me, regNo);
            case HOD -> {
                if (!dept.equals(me.deptKey())) requireMentor(me, regNo);
            }
            default -> requireCollege(dept);
        }
        List<String> arrears = arrears(regNo);
        int[] att = attendance(regNo);
        List<SubjectMark> marks = db.sql("""
                        SELECT m.subject_code, coalesce(j.title, m.subject_code), m.component, m.value FROM internal_marks m
                        LEFT JOIN subjects j ON j.dept_key = m.dept_key AND j.semester = m.semester AND j.code = m.subject_code
                        WHERE m.reg_no = ? ORDER BY m.subject_code, m.component
                        """).param(regNo)
                .query((rs, n) -> new SubjectMark(rs.getString(1), rs.getString(2), rs.getString(3), rs.getDouble(4))).list();
        String email = db.sql("SELECT coalesce(email, '') FROM users WHERE reg_no = ? LIMIT 1").param(regNo).query(String.class)
                .optional().orElse("");
        return new Profile(regNo, (String) s.get("name"), dept, num(s.get("semester")), (String) s.get("year_label"), email,
                (String) s.get("phone"), arrears.size(), arrears, pct(att[1], att[0]), att[0], att[1], att[0] - att[1],
                iaAverage(regNo), marks, activities(regNo), sessionsWhere("s.reg_no = ?", regNo), concernsWhere("c.reg_no = ?", regNo));
    }

    // ---------------------------------------------------------------- HOD

    @GetMapping("/hod/overview")
    HodOverview hodOverview(@RequestParam(required = false) String deptKey) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        return overviewOf(me.deptKey());
    }

    @GetMapping("/hod/allocations")
    List<AllocationDetail> hodAllocations(@RequestParam(required = false) String deptKey) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        return db.sql("""
                        SELECT a.id, a.reg_no, s.name, a.semester, a.faculty_user_id, u.display_name, u.username, a.status,
                               a.academic_year, a.assigned_by, a.adean_remarks, a.created_at, a.approved_at
                        FROM mentor_allocations a JOIN students s ON s.reg_no = a.reg_no JOIN users u ON u.id = a.faculty_user_id
                        WHERE a.dept_key = ? ORDER BY a.semester, a.reg_no
                        """).param(me.deptKey())
                .query((rs, n) -> new AllocationDetail(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getInt(4), rs.getLong(5),
                        rs.getString(6), rs.getString(7), rs.getString(8), rs.getString(9), rs.getString(10), rs.getString(11),
                        time(rs.getObject(12, OffsetDateTime.class)), time(rs.getObject(13, OffsetDateTime.class))))
                .list();
    }

    @GetMapping("/hod/eligible-students")
    List<EligibleStudent> eligible(@RequestParam(required = false) String deptKey) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        return db.sql("""
                        SELECT s.reg_no, s.name, s.dept_key, s.semester, s.year_label, a.faculty_user_id, u.display_name, a.status
                        FROM students s LEFT JOIN mentor_allocations a ON a.reg_no = s.reg_no
                        LEFT JOIN users u ON u.id = a.faculty_user_id
                        WHERE s.dept_key = ? ORDER BY s.semester, s.reg_no
                        """).param(me.deptKey())
                .query((rs, n) -> {
                    Long fid = rs.getObject(6) == null ? null : rs.getLong(6);
                    String st = rs.getString(8);
                    return new EligibleStudent(rs.getString(1), rs.getString(2), rs.getString(3), rs.getInt(4), rs.getString(5),
                            fid, rs.getString(7), fid, rs.getString(7), st == null ? "UNASSIGNED" : st);
                }).list();
    }

    @GetMapping("/hod/faculty")
    List<FacultyOption> faculty(@RequestParam(required = false) String deptKey) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        return facultyOf(me.deptKey());
    }

    @PostMapping("/hod/allocate")
    @Transactional
    Map<String, Object> allocate(@RequestBody AllocateRequest req) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        if (req == null || req.allocations() == null || req.allocations().isEmpty()) throw ApiException.badRequest("Choose the students and their mentors");
        String batch = newBatch();
        int n = save(me, req.allocations(), batch, blank(req.academicYear()) ? ErpSupport.academicYear() : req.academicYear());
        notifyOfficers(me.deptKey(), "Mentor allotment to approve",
                "The HOD of " + me.deptKey().toUpperCase(Locale.ROOT) + " allotted mentors to " + n + " students. Open Mentoring to approve it.");
        return Map.of("allocated", n, "batchId", batch);
    }

    @PostMapping("/hod/auto-allocate")
    @Transactional
    AutoAllocateResult autoAllocate(@RequestBody AutoAllocateRequest req) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        String dept = me.deptKey();
        Integer sem = req == null ? null : req.semester();
        List<String> students = db.sql("""
                        SELECT s.reg_no FROM students s LEFT JOIN mentor_allocations a ON a.reg_no = s.reg_no
                        WHERE s.dept_key = ? AND (CAST(? AS SMALLINT) IS NULL OR s.semester = ?)
                          AND (a.id IS NULL OR a.status = 'REJECTED')
                        ORDER BY s.semester, s.reg_no
                        """).params(dept, sem, sem).query(String.class).list();
        List<FacultyOption> faculty = facultyOf(dept);
        if (faculty.isEmpty()) throw ApiException.badRequest("The department has no faculty to allot as mentors");
        if (students.isEmpty()) throw ApiException.badRequest("Every student already has a mentor (approved or waiting for approval)");
        boolean roundRobin = req != null && "ROUND_ROBIN".equalsIgnoreCase(req.strategy());
        Map<Long, Integer> load = new HashMap<>();
        for (FacultyOption f : faculty) load.put(f.id(), f.activeMenteeCount() + f.pendingMenteeCount());
        List<Pair> pairs = new ArrayList<>();
        for (int i = 0; i < students.size(); i++) {
            long fid = roundRobin ? faculty.get(i % faculty.size()).id()
                    : faculty.stream().min(Comparator.comparingInt((FacultyOption f) -> load.get(f.id())).thenComparing(FacultyOption::name)).get().id();
            load.merge(fid, 1, Integer::sum);
            pairs.add(new Pair(students.get(i), fid));
        }
        String batch = newBatch();
        int n = save(me, pairs, batch, req == null || blank(req.academicYear()) ? ErpSupport.academicYear() : req.academicYear());
        notifyOfficers(dept, "Mentor allotment to approve",
                "The HOD of " + dept.toUpperCase(Locale.ROOT) + " allotted mentors to " + n + " students automatically. Open Mentoring to approve it.");
        return new AutoAllocateResult(n, (int) pairs.stream().map(Pair::facultyId).distinct().count(), batch,
                n + " students allotted to " + faculty.size() + " faculty (" + (roundRobin ? "round robin" : "balanced")
                        + "). Sent to the Associate Dean for approval.", pairs);
    }

    @DeleteMapping("/hod/allocations/{id}")
    @Transactional
    Map<String, Object> deleteAllocation(@PathVariable long id) {
        return deleteAllocations(List.of(id));
    }

    @DeleteMapping("/hod/allocations")
    @Transactional
    Map<String, Object> deleteAllocations(@RequestBody List<Long> ids) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        int n = 0;
        for (Long id : ids == null ? List.<Long>of() : ids) {
            n += db.sql("DELETE FROM mentor_allocations WHERE id = ? AND dept_key = ?").params(id, me.deptKey()).update();
        }
        return Map.of("deleted", n);
    }

    @GetMapping("/hod/escalated-requests")
    List<Escalated> escalated(@RequestParam(required = false) String deptKey) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        return db.sql("""
                        SELECT c.id, c.reg_no, s.name, s.dept_key, s.semester, c.faculty_user_id, u.display_name, c.title, c.reason,
                               c.category, c.description, c.queries_about_mentor, c.preferred_mentor_notes, c.status,
                               c.mentor_response, c.hod_remarks, c.created_at, c.escalated_at
                        FROM mentoring_concerns c JOIN students s ON s.reg_no = c.reg_no LEFT JOIN users u ON u.id = c.faculty_user_id
                        WHERE s.dept_key = ? AND c.status = 'ESCALATED_TO_HOD' ORDER BY c.escalated_at DESC NULLS LAST, c.id DESC
                        """).param(me.deptKey())
                .query((rs, n) -> new Escalated(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getInt(5),
                        rs.getObject(6) == null ? null : rs.getLong(6), rs.getString(7), rs.getString(8), rs.getString(9),
                        rs.getString(10), rs.getString(11), rs.getString(12), rs.getString(13), rs.getString(14), rs.getString(15),
                        rs.getString(16), time(rs.getObject(17, OffsetDateTime.class)), time(rs.getObject(18, OffsetDateTime.class))))
                .list();
    }

    /** REASSIGN: a new mentor (takes effect at once; the HOD decided it on the student's request). RETAIN / RESOLVE: closed. */
    @PostMapping("/hod/resolve-mentor-change")
    @Transactional
    Map<String, Object> resolve(@RequestBody ResolveRequest req) {
        CurrentUser me = ErpSupport.require(Role.HOD);
        if (req == null || req.concernId() == null || blank(req.action())) throw ApiException.badRequest("Choose what to do");
        Map<String, Object> c = db.sql("""
                        SELECT c.reg_no, c.title, s.dept_key FROM mentoring_concerns c JOIN students s ON s.reg_no = c.reg_no
                        WHERE c.id = ? AND c.status = 'ESCALATED_TO_HOD'
                        """).param(req.concernId()).query().listOfRows().stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("Request not found or already decided"));
        if (!me.deptKey().equals(c.get("dept_key"))) throw new ApiException(HttpStatus.FORBIDDEN, "This request is of another department");
        String reg = (String) c.get("reg_no");
        String action = req.action().toUpperCase(Locale.ROOT);
        String note;
        switch (action) {
            case "REASSIGN" -> {
                if (req.newFacultyId() == null) throw ApiException.badRequest("Choose the new mentor");
                if (facultyOf(me.deptKey()).stream().noneMatch(f -> f.id() == req.newFacultyId())) {
                    throw ApiException.badRequest("The new mentor must be a faculty member of the department");
                }
                int sem = db.sql("SELECT semester FROM students WHERE reg_no = ?").param(reg).query(Integer.class).single();
                db.sql("""
                                INSERT INTO mentor_allocations (reg_no, faculty_user_id, dept_key, semester, academic_year, status, batch_id,
                                                                assigned_by, reviewed_by, approved_at)
                                VALUES (?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, now())
                                ON CONFLICT (reg_no) DO UPDATE SET faculty_user_id = EXCLUDED.faculty_user_id, status = 'APPROVED',
                                    batch_id = EXCLUDED.batch_id, assigned_by = EXCLUDED.assigned_by, reviewed_by = EXCLUDED.reviewed_by,
                                    approved_at = now(), adean_remarks = NULL
                                """).params(reg, req.newFacultyId(), me.deptKey(), sem, ErpSupport.academicYear(), newBatch(),
                        me.name(), me.name()).update();
                String name = db.sql("SELECT display_name FROM users WHERE id = ?").param(req.newFacultyId()).query(String.class).single();
                note = "Your mentor is changed to " + name + ".";
                notifications.notifyUser(req.newFacultyId(), Audience.FACULTY, me.deptKey(), null, "New mentee",
                        "The HOD made you the mentor of " + reg + ".", "mentoring");
            }
            case "RETAIN" -> note = "The HOD decided to keep your present mentor.";
            case "RESOLVE" -> note = "The HOD closed your request.";
            default -> throw ApiException.badRequest("Unknown action: " + req.action());
        }
        db.sql("UPDATE mentoring_concerns SET status = 'RESOLVED', hod_remarks = ?, updated_at = now() WHERE id = ?")
                .params(nul(req.hodRemarks(), 2000), req.concernId()).update();
        notifications.notifyUser(studentUser(reg), Audience.STUDENT, null, null, "Mentor change request decided",
                note + (blank(req.hodRemarks()) ? "" : " Remarks: " + req.hodRemarks().trim()), "mentoring");
        return Map.of("status", "RESOLVED", "action", action);
    }

    // ---------------------------------------------------------------- Associate Dean

    @GetMapping("/dean/pending-allocations")
    List<PendingAllocation> pending(@RequestParam(required = false) String deptKey) {
        ErpSupport.require(Role.DEAN);
        return pendingWhere(deptFilter(deptKey), null);
    }

    @PostMapping("/dean/review-allocations")
    @Transactional
    ReviewResult reviewAllocations(@RequestBody ReviewAllocationsRequest req) {
        CurrentUser me = ErpSupport.require(Role.DEAN);
        if (req == null || req.allocationIds() == null || req.allocationIds().isEmpty()) throw ApiException.badRequest("Choose the allotments");
        boolean approve = approve(req.action(), req.remarks());
        int n = 0;
        Map<String, Integer> byDept = new LinkedHashMap<>();
        for (Long id : req.allocationIds()) {
            Map<String, Object> a = db.sql("SELECT dept_key FROM mentor_allocations WHERE id = ? AND status = 'PENDING_ADEAN_APPROVAL'")
                    .param(id).query().listOfRows().stream().findFirst().orElse(null);
            if (a == null) continue;
            requireCollege((String) a.get("dept_key"));
            n += decide(me, "id = ?", id, approve, req.remarks());
            byDept.merge((String) a.get("dept_key"), 1, Integer::sum);
        }
        byDept.forEach((dept, count) -> notifyHod(dept, approve, count, req.remarks()));
        return new ReviewResult(approve ? n : 0, approve ? 0 : n, n + " allotment" + (n == 1 ? "" : "s") + (approve ? " approved." : " returned to the HOD."));
    }

    @GetMapping("/dean/pending-batches")
    List<PendingBatch> pendingBatches(@RequestParam(required = false) String deptKey) {
        ErpSupport.require(Role.DEAN);
        List<PendingAllocation> all = pendingWhere(deptFilter(deptKey), null);
        Map<String, List<PendingAllocation>> byBatch = new LinkedHashMap<>();
        for (PendingAllocation p : all) byBatch.computeIfAbsent(p.batchId(), k -> new ArrayList<>()).add(p);
        List<PendingBatch> out = new ArrayList<>();
        for (var e : byBatch.entrySet()) {
            List<PendingAllocation> l = e.getValue();
            PendingAllocation f = l.get(0);
            int total = db.sql("SELECT count(*) FROM students WHERE dept_key = ?").param(f.deptKey()).query(Integer.class).single();
            out.add(new PendingBatch(e.getKey(), f.deptKey(), f.academicYear(), f.assignedBy(), l.size(), total,
                    (int) l.stream().map(PendingAllocation::facultyId).distinct().count(), f.createdAt(), l));
        }
        return out;
    }

    @PostMapping("/dean/review-batch")
    @Transactional
    ReviewResult reviewBatch(@RequestBody BatchReviewRequest req) {
        CurrentUser me = ErpSupport.require(Role.DEAN);
        if (req == null || blank(req.batchId())) throw ApiException.badRequest("Choose the batch");
        boolean approve = approve(req.action(), req.remarks());
        String dept = db.sql("SELECT DISTINCT dept_key FROM mentor_allocations WHERE batch_id = ? AND status = 'PENDING_ADEAN_APPROVAL'")
                .param(req.batchId()).query(String.class).optional().orElseThrow(() -> ApiException.notFound("No pending allotments in this batch"));
        requireCollege(dept);
        int n = decide(me, "batch_id = ?", req.batchId(), approve, req.remarks());
        notifyHod(dept, approve, n, req.remarks());
        return new ReviewResult(approve ? n : 0, approve ? 0 : n, n + " allotment" + (n == 1 ? "" : "s") + (approve ? " approved." : " returned to the HOD."));
    }

    @GetMapping("/institutional/overview")
    CollegeOverview college(@RequestParam(required = false) String collegeKey) {
        ErpSupport.require(Role.DEAN);
        String college = departments.college();
        List<String> depts = db.sql("SELECT dept_key FROM departments WHERE college_key = ? ORDER BY dept_key").param(college)
                .query(String.class).list();
        List<HodOverview> rows = new ArrayList<>();
        int students = 0, allocated = 0, mentors = 0, sessions = 0, concerns = 0, pending = 0;
        for (String d : depts) {
            HodOverview o = overviewOf(d);
            rows.add(o);
            students += db.sql("SELECT count(*) FROM students WHERE dept_key = ?").param(d).query(Integer.class).single();
            allocated += o.totalMentees();
            mentors += o.totalMentors();
            sessions += o.totalSessions();
            concerns += o.activeConcerns();
            pending += o.pendingApprovals();
        }
        return new CollegeOverview(college, students, allocated, mentors, sessions, concerns, pending, rows);
    }

    // ---------------------------------------------------------------- rules

    private int save(CurrentUser me, List<Pair> pairs, String batch, String year) {
        List<Long> allowed = facultyOf(me.deptKey()).stream().map(FacultyOption::id).toList();
        int n = 0;
        for (Pair p : pairs) {
            if (p == null || blank(p.studentRegNo()) || p.facultyId() == null) continue;
            if (!allowed.contains(p.facultyId())) throw ApiException.badRequest("Mentors must be faculty of the department");
            Integer sem = db.sql("SELECT semester FROM students WHERE reg_no = ? AND dept_key = ?").params(p.studentRegNo(), me.deptKey())
                    .query(Integer.class).optional().orElseThrow(() -> ApiException.badRequest(p.studentRegNo() + " is not a student of your department"));
            n += db.sql("""
                            INSERT INTO mentor_allocations (reg_no, faculty_user_id, dept_key, semester, academic_year, status, batch_id, assigned_by)
                            VALUES (?, ?, ?, ?, ?, 'PENDING_ADEAN_APPROVAL', ?, ?)
                            ON CONFLICT (reg_no) DO UPDATE SET faculty_user_id = EXCLUDED.faculty_user_id, semester = EXCLUDED.semester,
                                academic_year = EXCLUDED.academic_year, status = 'PENDING_ADEAN_APPROVAL', batch_id = EXCLUDED.batch_id,
                                assigned_by = EXCLUDED.assigned_by, adean_remarks = NULL, reviewed_by = NULL, approved_at = NULL,
                                created_at = now()
                            """).params(p.studentRegNo(), p.facultyId(), me.deptKey(), sem, year, batch, me.name()).update();
        }
        return n;
    }

    private int decide(CurrentUser me, String where, Object key, boolean approve, String remarks) {
        return db.sql("UPDATE mentor_allocations SET status = ?, reviewed_by = ?, adean_remarks = ?, approved_at = CASE WHEN ? THEN now() END "
                        + "WHERE status = 'PENDING_ADEAN_APPROVAL' AND " + where)
                .params(approve ? "APPROVED" : "REJECTED", me.name(), nul(remarks, 500), approve, key).update();
    }

    private void notifyHod(String dept, boolean approve, int count, String remarks) {
        if (count == 0) return;
        notifications.notify(Audience.HOD, dept, null, approve ? "Mentor allotment approved" : "Mentor allotment returned",
                "The Associate Dean " + (approve ? "approved " : "returned ") + count + " mentor allotment" + (count == 1 ? "" : "s")
                        + (blank(remarks) ? "." : ": " + remarks.trim()), "mentoring");
    }

    private List<PendingAllocation> pendingWhere(String deptCondition, Object unused) {
        return db.sql("""
                        SELECT a.id, a.reg_no, s.name, a.dept_key, a.semester, a.faculty_user_id, u.display_name, u.username,
                               a.academic_year, a.assigned_by, a.status, a.batch_id, a.created_at
                        FROM mentor_allocations a JOIN students s ON s.reg_no = a.reg_no JOIN users u ON u.id = a.faculty_user_id
                        WHERE a.status = 'PENDING_ADEAN_APPROVAL' AND""" + departments.inCollege("a.dept_key") + deptCondition + """
                         ORDER BY a.created_at DESC, a.dept_key, a.semester, a.reg_no
                        """)
                .query((rs, n) -> new PendingAllocation(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getInt(5),
                        rs.getLong(6), rs.getString(7), rs.getString(8), rs.getString(9), rs.getString(10), rs.getString(11),
                        rs.getString(12), time(rs.getObject(13, OffsetDateTime.class))))
                .list();
    }

    private String deptFilter(String deptKey) {
        return blank(deptKey) || "ALL".equalsIgnoreCase(deptKey) ? " " : " AND a.dept_key = '" + departments.key(deptKey) + "' ";
    }

    private HodOverview overviewOf(String dept) {
        List<MentorStat> mentors = db.sql("""
                        SELECT u.id, u.display_name, u.username,
                               (SELECT count(*) FROM mentor_allocations a WHERE a.faculty_user_id = u.id AND a.status = 'APPROVED'),
                               (SELECT count(*) FROM mentoring_sessions m WHERE m.faculty_user_id = u.id),
                               (SELECT count(*) FROM mentor_allocations a WHERE a.faculty_user_id = u.id AND a.status = 'PENDING_ADEAN_APPROVAL')
                        FROM users u WHERE u.role = 'FACULTY' AND u.enabled AND u.dept_key = ? ORDER BY u.display_name
                        """).param(dept)
                .query((rs, n) -> new MentorStat(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getInt(4), rs.getInt(5), rs.getInt(6)))
                .list();
        int mentees = count("SELECT count(*) FROM mentor_allocations WHERE dept_key = ? AND status = 'APPROVED'", dept);
        int sessions = count("SELECT count(*) FROM mentoring_sessions m JOIN students s ON s.reg_no = m.reg_no WHERE s.dept_key = ?", dept);
        int active = count("SELECT count(*) FROM mentoring_concerns c JOIN students s ON s.reg_no = c.reg_no WHERE s.dept_key = ? AND c.status IN ('SUBMITTED', 'IN_REVIEW')", dept);
        int escalated = count("SELECT count(*) FROM mentoring_concerns c JOIN students s ON s.reg_no = c.reg_no WHERE s.dept_key = ? AND c.status = 'ESCALATED_TO_HOD'", dept);
        int pending = count("SELECT count(*) FROM mentor_allocations WHERE dept_key = ? AND status = 'PENDING_ADEAN_APPROVAL'", dept);
        int rejected = count("SELECT count(*) FROM mentor_allocations WHERE dept_key = ? AND status = 'REJECTED'", dept);
        int activeMentors = (int) mentors.stream().filter(m -> m.menteeCount() > 0).count();
        return new HodOverview(dept, mentees, activeMentors, sessions, active, escalated, mentors, pending, rejected);
    }

    private List<FacultyOption> facultyOf(String dept) {
        return db.sql("""
                        SELECT u.id, u.display_name, u.username,
                               (SELECT count(*) FROM mentor_allocations a WHERE a.faculty_user_id = u.id AND a.status = 'APPROVED'),
                               (SELECT count(*) FROM mentor_allocations a WHERE a.faculty_user_id = u.id AND a.status = 'PENDING_ADEAN_APPROVAL')
                        FROM users u WHERE u.role = 'FACULTY' AND u.enabled AND u.dept_key = ? ORDER BY u.display_name
                        """).param(dept)
                .query((rs, n) -> new FacultyOption(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getInt(4), rs.getInt(5),
                        rs.getInt(4), rs.getInt(5)))
                .list();
    }

    private Map<String, Object> allocationOf(String reg) {
        return db.sql("SELECT * FROM mentor_allocations WHERE reg_no = ?").param(reg).query().listOfRows().stream().findFirst().orElse(null);
    }

    private MentorInfo mentorInfo(long id) {
        return db.sql("""
                        SELECT u.id, u.display_name, u.username, coalesce(d.name, ''), coalesce(u.email, ''), coalesce(u.phone, '')
                        FROM users u LEFT JOIN departments d ON d.dept_key = u.dept_key WHERE u.id = ?
                        """).param(id)
                .query((rs, n) -> new MentorInfo(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), "Department staff room"))
                .single();
    }

    private void requireMentor(CurrentUser me, String reg) {
        int n = db.sql("SELECT count(*) FROM mentor_allocations WHERE reg_no = ? AND faculty_user_id = ? AND status = 'APPROVED'")
                .params(reg, me.id()).query(Integer.class).single();
        if (n == 0) throw new ApiException(HttpStatus.FORBIDDEN, "You are not the approved mentor of " + reg);
    }

    private void requireCollege(String dept) {
        int n = db.sql("SELECT count(*) FROM departments WHERE dept_key = ? AND college_key = ?").params(dept, departments.college())
                .query(Integer.class).single();
        if (n == 0) throw new ApiException(HttpStatus.FORBIDDEN, "This is of another college");
    }

    private void notifyOfficers(String dept, String title, String message) {
        List<Long> ids = db.sql("""
                        SELECT u.id FROM users u JOIN departments d ON d.college_key = u.college_key
                        WHERE d.dept_key = ? AND u.role = 'DEAN' AND u.enabled AND coalesce(u.officer_title, 'ASSOCIATE_DEAN') = 'ASSOCIATE_DEAN'
                        """).param(dept).query(Long.class).list();
        for (Long id : ids) notifications.notifyUser(id, Audience.DEAN, dept, null, title, message, "mentoring");
    }

    private long studentUser(String reg) {
        return db.sql("SELECT id FROM users WHERE reg_no = ? LIMIT 1").param(reg).query(Long.class).optional().orElse(0L);
    }

    private List<SessionView> sessionsWhere(String where, Object... params) {
        return db.sql("""
                        SELECT s.id, s.faculty_user_id, u.display_name, s.reg_no, st.name, s.session_date, s.session_type, s.meeting_mode,
                               s.topics_discussed, s.guidance_notes, s.action_items, s.next_review_date, s.attendance_status, s.created_at
                        FROM mentoring_sessions s JOIN users u ON u.id = s.faculty_user_id JOIN students st ON st.reg_no = s.reg_no
                        WHERE """ + " " + where + " ORDER BY s.session_date DESC, s.id DESC")
                .params(params)
                .query((rs, n) -> new SessionView(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), rs.getString(7), rs.getString(8), rs.getString(9), rs.getString(10), rs.getString(11),
                        rs.getString(12), rs.getString(13), time(rs.getObject(14, OffsetDateTime.class))))
                .list();
    }

    private List<ConcernView> concernsWhere(String where, Object... params) {
        return db.sql("""
                        SELECT c.id, c.reg_no, st.name, c.faculty_user_id, coalesce(u.display_name, 'HOD'), c.title, c.category,
                               c.description, c.status, c.mentor_response, c.hod_remarks, c.created_at, c.updated_at
                        FROM mentoring_concerns c JOIN students st ON st.reg_no = c.reg_no LEFT JOIN users u ON u.id = c.faculty_user_id
                        WHERE """ + " " + where + " ORDER BY c.updated_at DESC, c.id DESC")
                .params(params)
                .query((rs, n) -> new ConcernView(rs.getLong(1), rs.getString(2), rs.getString(3),
                        rs.getObject(4) == null ? null : rs.getLong(4), rs.getString(5), rs.getString(6), rs.getString(7),
                        rs.getString(8), rs.getString(9), rs.getString(10), rs.getString(11),
                        time(rs.getObject(12, OffsetDateTime.class)), time(rs.getObject(13, OffsetDateTime.class))))
                .list();
    }

    private ConcernView concern(long id) {
        return concernsWhere("c.id = ?", id).get(0);
    }

    /** Subjects failed in a published result and not passed since. */
    private List<String> arrears(String reg) {
        return db.sql("""
                        SELECT b.subject_code FROM result_records r JOIN result_batches b ON b.id = r.batch_id
                        WHERE r.reg_no = ? AND b.status = 'PUBLISHED'
                        GROUP BY b.subject_code HAVING bool_or(r.passed) = FALSE ORDER BY 1
                        """).param(reg).query(String.class).list();
    }

    /** {classes conducted, attended incl. on duty} from the approved attendance registers. */
    private int[] attendance(String reg) {
        return db.sql("""
                        SELECT (SELECT count(*) FROM (SELECT DISTINCT r2.batch_id, r2.attendance_date, r2.session_slot
                                FROM attendance_records r2 JOIN attendance_batches b2 ON b2.batch_id = r2.batch_id
                                JOIN students s ON s.reg_no = ? WHERE b2.status = 'ADEAN_APPROVED' AND b2.dept_key = s.dept_key
                                  AND b2.semester = s.semester) c),
                               (SELECT count(*) FROM attendance_records r JOIN attendance_batches b ON b.batch_id = r.batch_id
                                WHERE r.reg_no = ? AND b.status = 'ADEAN_APPROVED' AND r.status IN ('PRESENT', 'ON_DUTY'))
                        """).params(reg, reg).query((rs, n) -> new int[]{rs.getInt(1), rs.getInt(2)}).single();
    }

    private double iaAverage(String reg) {
        Double v = db.sql("SELECT avg(value) FROM internal_marks WHERE reg_no = ?").param(reg).query(Double.class).optional().orElse(null);
        return v == null ? 0 : Math.round(v * 10) / 10.0;
    }

    private List<Activity> activities(String reg) {
        return db.sql("""
                        SELECT id, activity_type, title, organization, achievement, academic_year, event_date::text
                        FROM student_activities WHERE reg_no = ? ORDER BY event_date DESC
                        """).param(reg)
                .query((rs, n) -> new Activity(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5),
                        rs.getString(6), rs.getString(7)))
                .list();
    }

    private int count(String sql, Object param) {
        return db.sql(sql).param(param).query(Integer.class).single();
    }

    private static boolean approve(String action, String remarks) {
        if (action == null) throw ApiException.badRequest("Approve or reject");
        boolean approve = "APPROVE".equalsIgnoreCase(action);
        if (!approve && !"REJECT".equalsIgnoreCase(action)) throw ApiException.badRequest("Approve or reject");
        return approve;
    }

    private static String checkStatus(String s) {
        if (!CONCERN_STATUSES.contains(s)) throw ApiException.badRequest("Unknown status: " + s);
        return s;
    }

    private static String newBatch() {
        return "MB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private static String upper(String s, String fallback) {
        return blank(s) ? fallback : clip(s.trim().toUpperCase(Locale.ROOT).replace(' ', '_'), 20);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String nul(String s, int max) {
        return blank(s) ? null : clip(s.trim(), max);
    }

    private static String clip(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }

    private static int num(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }

    private static double pct(int part, int whole) {
        return whole == 0 ? 0 : Math.round(part * 1000.0 / whole) / 10.0;
    }

    private static String time(OffsetDateTime t) {
        return t == null ? null : t.toString();
    }
}
