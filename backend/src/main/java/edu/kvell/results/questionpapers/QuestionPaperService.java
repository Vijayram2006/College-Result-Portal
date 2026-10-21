package edu.kvell.results.questionpapers;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Question papers and their five-stage approval: 1 Faculty (submits) → 2 HOD (scrutiny) → 3 Associate Dean (review)
 * → 4 College COE (forwards, chooses the set) → 5 Chief COE (releases with a seal number). Any stage after the first
 * can send a paper back to an earlier one with a reason. Every move is checked here (who may act on which status),
 * recorded in the audit log and announced to the next stage. Papers are confidential: each person sees only the
 * papers of their own department (faculty, HOD) or college (Associate Dean, COE).
 */
@Service
public class QuestionPaperService {

    public record Attachment(String fileName, String dataUrl) {
    }

    /** A new paper, or a resubmission after it was returned. content is the paper as the screens hold it. */
    public record PaperInput(String subjectCode, String subjectTitle, String semester, String academicYear,
                             String regulation, String examType, String set, Map<String, Object> content,
                             Attachment pdf, String remarks) {
    }

    /** action: APPROVE (HOD, Associate Dean), FORWARD (COE), RELEASE (Chief COE) or RETURN (to returnTo). */
    public record ActionRequest(String action, String remarks, String returnTo, String set,
                                Map<String, Object> hodDeclaration, Integer expectedVersion) {
    }

    static final List<String> STAGE_ROLES = List.of("Faculty", "HOD", "AD", "COE", "Chief COE");
    static final Set<String> EXAM_TYPES = Set.of("End Semester Examination", "Internal Assessment - I",
            "Internal Assessment - II", "Model Examination");
    static final int MAX_PDF_BYTES = 15 * 1024 * 1024;
    static final int MAX_CONTENT_CHARS = 200_000;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH);
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final NotificationService notifications;
    private final ObjectMapper json;

    public QuestionPaperService(JdbcClient db, Departments departments, AuditService audit,
                                NotificationService notifications, ObjectMapper json) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
        this.notifications = notifications;
        this.json = json;
    }

    // ---------------------------------------------------------------- reading

    public List<Map<String, Object>> list(CurrentUser user) {
        Scope scope = scope(user);
        return db.sql("""
                        SELECT q.*, d.name AS dept_name FROM question_papers q JOIN departments d ON d.dept_key = q.dept_key
                        WHERE (CAST(:college AS VARCHAR) IS NULL OR q.college_key = :college)
                          AND (CAST(:dept AS VARCHAR) IS NULL OR q.dept_key = :dept)
                          AND (CAST(:author AS VARCHAR) IS NULL OR q.faculty_username = :author)
                        ORDER BY q.updated_at DESC
                        """)
                .param("college", scope.college()).param("dept", scope.dept()).param("author", scope.author())
                .query((rs, n) -> row(rs)).list().stream().map(this::view).toList();
    }

    public Map<String, Object> get(long id, CurrentUser user) {
        return view(load(id, user));
    }

    /** The PDF of a paper the user may see; downloads are audited (papers are confidential before the exam). */
    public Pdf pdf(long id, CurrentUser user, String ip) {
        Map<String, Object> p = load(id, user);
        byte[] bytes = db.sql("SELECT pdf FROM question_papers WHERE id = ?").param(id).query(byte[].class).optional()
                .orElse(null);
        if (bytes == null) throw ApiException.notFound("This question paper has no PDF");
        audit.record(user.username(), user.name(), "VIEWED_QUESTION_PAPER", "QP-" + id,
                "Opened the question paper PDF of " + p.get("subject_code") + ".", ip);
        return new Pdf((String) p.get("pdf_name"), bytes);
    }

    public record Pdf(String fileName, byte[] bytes) {
    }

    // ---------------------------------------------------------------- creating

    @Transactional
    public Map<String, Object> create(PaperInput in, CurrentUser user, String ip) {
        if (user.role() != Role.FACULTY && user.role() != Role.HOD) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Question papers are submitted by faculty or the HOD");
        }
        Clean c = clean(in);
        // A faculty member's paper goes to the HOD; the HOD's own paper goes straight to the Associate Dean
        boolean byHod = user.role() == Role.HOD;
        String status = byHod ? "PENDING_AD_REVIEW" : "PENDING_HOD_REVIEW";
        int stage = byHod ? 3 : 2;
        List<Map<String, Object>> trail = emptyTrail();
        sign(trail, 1, user, "COMPLETED", null, c.remarks());
        if (byHod) sign(trail, 2, user, "COMPLETED", null, "Submitted by the HOD");
        mark(trail, stage, "CURRENT");
        long id = db.sql("""
                        INSERT INTO question_papers (college_key, dept_key, subject_code, subject_title, semester,
                            academic_year, regulation, exam_type, set_label, status, stage, content, trail,
                            faculty_username, faculty_name, remarks, pdf, pdf_name, pdf_size)
                        VALUES (:college, :dept, :code, :title, :sem, :ay, :reg, :exam, :set, :status, :stage,
                                CAST(:content AS JSONB), CAST(:trail AS JSONB), :fu, :fn, :remarks, :pdf, :pname, :psize)
                        RETURNING id
                        """)
                .param("college", departments.college()).param("dept", user.deptKey()).param("code", c.code())
                .param("title", c.title()).param("sem", c.semester()).param("ay", c.academicYear())
                .param("reg", c.regulation()).param("exam", c.examType()).param("set", c.set())
                .param("status", status).param("stage", stage).param("content", write(c.content()))
                .param("trail", write(trail)).param("fu", user.username()).param("fn", user.name())
                .param("remarks", c.remarks()).param("pdf", c.pdf()).param("pname", c.pdfName())
                .param("psize", c.pdf() == null ? null : c.pdf().length)
                .query(Long.class).single();
        audit.record(user.username(), user.name(), "SUBMITTED_QUESTION_PAPER", "QP-" + id,
                "Submitted the " + c.examType() + " question paper for " + c.code() + " " + c.title() + " (" + c.set()
                        + ") to the " + (byHod ? "Associate Dean" : "HOD") + ".", ip);
        announce(user.deptKey(), byHod ? 3 : 2, c.code() + " question paper submitted",
                c.code() + " " + c.title() + " (" + c.examType() + ") is waiting for your review.");
        return get(id, user);
    }

    /** Resubmits a paper returned to the faculty member (by its author) or to the HOD (by the department's HOD). */
    @Transactional
    public Map<String, Object> resubmit(long id, PaperInput in, CurrentUser user, String ip) {
        Map<String, Object> p = load(id, user);
        String status = (String) p.get("status");
        boolean author = user.role() == Role.FACULTY && user.username().equals(p.get("faculty_username"));
        boolean hod = user.role() == Role.HOD;
        if (!(author && "RETURNED_TO_FACULTY".equals(status)) && !(hod && "RETURNED_TO_HOD".equals(status))) {
            throw ApiException.conflict("This question paper is not waiting for your changes");
        }
        Clean c = clean(in);
        int next = hod ? 3 : 2;
        List<Map<String, Object>> trail = trail(p);
        sign(trail, hod ? 2 : 1, user, "COMPLETED", null, c.remarks() == null ? "Corrected and resubmitted" : c.remarks());
        for (int s = next; s <= 5; s++) mark(trail, s, "PENDING");
        mark(trail, next, "CURRENT");
        db.sql("""
                        UPDATE question_papers SET subject_code = :code, subject_title = :title, semester = :sem,
                            academic_year = :ay, regulation = :reg, exam_type = :exam, set_label = :set,
                            content = CAST(:content AS JSONB), trail = CAST(:trail AS JSONB), status = :status,
                            stage = :stage, remarks = :remarks,
                            pdf = coalesce(CAST(:pdf AS BYTEA), pdf), pdf_name = coalesce(CAST(:pname AS VARCHAR), pdf_name),
                            pdf_size = coalesce(CAST(:psize AS INTEGER), pdf_size), version = version + 1, updated_at = now()
                        WHERE id = :id
                        """)
                .param("code", c.code()).param("title", c.title()).param("sem", c.semester())
                .param("ay", c.academicYear()).param("reg", c.regulation()).param("exam", c.examType())
                .param("set", c.set()).param("content", write(c.content())).param("trail", write(trail))
                .param("status", hod ? "PENDING_AD_REVIEW" : "PENDING_HOD_REVIEW").param("stage", next)
                .param("remarks", c.remarks()).param("pdf", c.pdf()).param("pname", c.pdfName())
                .param("psize", c.pdf() == null ? null : c.pdf().length).param("id", id).update();
        audit.record(user.username(), user.name(), "RESUBMITTED_QUESTION_PAPER", "QP-" + id,
                "Resubmitted the corrected question paper for " + c.code() + ".", ip, status,
                hod ? "PENDING_AD_REVIEW" : "PENDING_HOD_REVIEW");
        announce((String) p.get("dept_key"), next, c.code() + " question paper resubmitted",
                c.code() + " " + c.title() + " was corrected and is waiting for your review.");
        return get(id, user);
    }

    // ---------------------------------------------------------------- moving through the stages

    @Transactional
    public Map<String, Object> act(long id, ActionRequest req, CurrentUser user, String ip) {
        if (req == null || req.action() == null) throw ApiException.badRequest("Choose an action");
        Map<String, Object> p = load(id, user);
        int version = ((Number) p.get("version")).intValue();
        if (req.expectedVersion() != null && req.expectedVersion() != version) {
            throw ApiException.conflict("Someone else changed this question paper just now. Reload it and try again.");
        }
        String status = (String) p.get("status");
        int actorStage = actorStage(user);
        String action = req.action().trim().toUpperCase(Locale.ROOT);
        String remarks = req.remarks() == null ? null : req.remarks().trim();
        if (remarks != null && remarks.length() > 500) throw ApiException.badRequest("Remarks: at most 500 characters");
        List<Map<String, Object>> trail = trail(p);
        Map<String, Object> content = content(p);
        String newStatus;
        int newStage;
        String seal = null;
        String set = (String) p.get("set_label");

        if ("RETURN".equals(action)) {
            if (!waitingFor(status, actorStage)) throw ApiException.conflict("This question paper is not waiting for you");
            if (remarks == null || remarks.length() < 5) {
                throw ApiException.badRequest("Give the reason for returning the paper (at least 5 characters)");
            }
            int to = stageOf(req.returnTo());
            if (to < 1 || to >= actorStage) throw ApiException.badRequest("A paper can only be returned to an earlier stage");
            newStage = to;
            newStatus = switch (to) {
                case 1 -> "RETURNED_TO_FACULTY";
                case 2 -> "RETURNED_TO_HOD";
                case 3 -> "RETURNED_TO_AD";
                default -> "RETURNED_TO_COE";
            };
            sign(trail, actorStage, user, "RETURNED", null, remarks);
            for (int s = to + 1; s < actorStage; s++) mark(trail, s, "PENDING");
            mark(trail, to, "CURRENT");
        } else {
            String expected = switch (actorStage) {
                case 2 -> "APPROVE";
                case 3 -> "APPROVE";
                case 4 -> "FORWARD";
                case 5 -> "RELEASE";
                default -> "";
            };
            if (!expected.equals(action)) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Your role cannot " + action.toLowerCase(Locale.ROOT)
                        + " question papers");
            }
            if (!waitingFor(status, actorStage)) throw ApiException.conflict("This question paper is not waiting for you");
            if (actorStage == 2 && req.hodDeclaration() != null) content.put("hodDeclaration", req.hodDeclaration());
            if (actorStage == 3 && remarks != null) content.put("adRemarks", remarks);
            if (actorStage == 4) {
                if (req.set() != null && !req.set().isBlank()) set = cleanSet(req.set());
                seal = "COE/QP/" + OffsetDateTime.now(IST).getYear() + "/" + String.format("%05d", id) + "-"
                        + String.format("%04d", RANDOM.nextInt(10_000));
            }
            if (actorStage == 5) {
                seal = "CHIEF/SEAL/" + OffsetDateTime.now(IST).getYear() + "/" + String.format("%05d", id) + "-"
                        + String.format("%04d", RANDOM.nextInt(10_000));
            }
            sign(trail, actorStage, user, "COMPLETED", seal, remarks);
            if (actorStage < 5) {
                newStage = actorStage + 1;
                newStatus = switch (newStage) {
                    case 3 -> "PENDING_AD_REVIEW";
                    case 4 -> "PENDING_COE_REVIEW";
                    default -> "PENDING_CHIEF_COE";
                };
                mark(trail, newStage, "CURRENT");
            } else {
                newStage = 5;
                newStatus = "CHIEF_COE_APPROVED";
            }
        }
        db.sql("""
                        UPDATE question_papers SET status = :status, stage = :stage, trail = CAST(:trail AS JSONB),
                            content = CAST(:content AS JSONB), set_label = :set,
                            coe_reference_no = coalesce(CAST(:ref AS VARCHAR), coe_reference_no),
                            chief_seal_no = coalesce(CAST(:chief AS VARCHAR), chief_seal_no),
                            remarks = coalesce(CAST(:remarks AS VARCHAR), remarks), version = version + 1, updated_at = now()
                        WHERE id = :id AND version = :version
                        """)
                .param("status", newStatus).param("stage", newStage).param("trail", write(trail))
                .param("content", write(content)).param("set", set)
                .param("ref", actorStage == 4 && !"RETURN".equals(action) ? seal : null)
                .param("chief", actorStage == 5 && !"RETURN".equals(action) ? seal : null)
                .param("remarks", remarks).param("id", id).param("version", version).update();
        String code = (String) p.get("subject_code");
        audit.record(user.username(), user.name(), "QUESTION_PAPER_" + action, "QP-" + id,
                STAGE_ROLES.get(actorStage - 1) + " " + action.toLowerCase(Locale.ROOT) + " the question paper for " + code
                        + (remarks == null ? "." : ": " + remarks), ip, status, newStatus);
        if ("RETURN".equals(action)) {
            announce((String) p.get("dept_key"), newStage, code + " question paper returned",
                    "The " + STAGE_ROLES.get(actorStage - 1) + " returned " + code + ": " + remarks);
        } else if (newStage <= 5 && !"CHIEF_COE_APPROVED".equals(newStatus)) {
            announce((String) p.get("dept_key"), newStage, code + " question paper waiting for you",
                    code + " " + p.get("subject_title") + " was approved by the " + STAGE_ROLES.get(actorStage - 1)
                            + " and is waiting for your review.");
        } else {
            announce((String) p.get("dept_key"), 1, code + " question paper released",
                    "The Chief COE released " + code + " (" + set + ") for the examination.");
        }
        return get(id, user);
    }

    // ---------------------------------------------------------------- rules

    /** The stage a user acts at: HOD 2, Associate Dean 3, college COE 4, Chief COE 5 (faculty 1). */
    static int actorStage(CurrentUser user) {
        return switch (user.role()) {
            case FACULTY -> 1;
            case HOD -> 2;
            case DEAN -> 3;
            case ADMIN -> 4;
            case SUPER_ADMIN -> 5;
            default -> 0;
        };
    }

    /** Whether a paper in this status is waiting for the given stage (a paper returned to a stage waits there). */
    static boolean waitingFor(String status, int stage) {
        return switch (stage) {
            case 2 -> "PENDING_HOD_REVIEW".equals(status) || "RETURNED_TO_HOD".equals(status);
            case 3 -> "PENDING_AD_REVIEW".equals(status) || "RETURNED_TO_AD".equals(status);
            case 4 -> "PENDING_COE_REVIEW".equals(status) || "RETURNED_TO_COE".equals(status);
            case 5 -> "PENDING_CHIEF_COE".equals(status);
            default -> false;
        };
    }

    static int stageOf(String role) {
        if (role == null) return -1;
        String r = role.trim().toUpperCase(Locale.ROOT).replace(' ', '_');
        return switch (r) {
            case "FACULTY" -> 1;
            case "HOD" -> 2;
            case "AD", "ASSOCIATE_DEAN" -> 3;
            case "COE" -> 4;
            default -> -1;
        };
    }

    private record Scope(String college, String dept, String author) {
    }

    /**
     * A faculty member sees only the papers they wrote, the HOD the department's, the Associate Dean and the college
     * COE their college's.
     */
    private Scope scope(CurrentUser user) {
        return switch (user.role()) {
            case FACULTY -> new Scope(departments.college(), user.deptKey(), user.username());
            case HOD -> new Scope(departments.college(), user.deptKey(), null);
            case DEAN, ADMIN -> new Scope(departments.college(), null, null);
            // The Chief COE releases the papers of all three colleges
            case SUPER_ADMIN -> new Scope(null, null, null);
            default -> throw new ApiException(HttpStatus.FORBIDDEN, "Question papers are not available to this account");
        };
    }

    private Map<String, Object> load(long id, CurrentUser user) {
        Scope scope = scope(user);
        return db.sql("""
                        SELECT q.*, d.name AS dept_name FROM question_papers q JOIN departments d ON d.dept_key = q.dept_key
                        WHERE q.id = :id AND (CAST(:college AS VARCHAR) IS NULL OR q.college_key = :college)
                          AND (CAST(:dept AS VARCHAR) IS NULL OR q.dept_key = :dept)
                          AND (CAST(:author AS VARCHAR) IS NULL OR q.faculty_username = :author)
                        """)
                .param("id", id).param("college", scope.college()).param("dept", scope.dept())
                .param("author", scope.author())
                .query((rs, n) -> row(rs)).optional()
                .orElseThrow(() -> ApiException.notFound("Question paper not found"));
    }

    private static Map<String, Object> row(java.sql.ResultSet rs) throws java.sql.SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        for (String col : List.of("id", "college_key", "dept_key", "dept_name", "subject_code", "subject_title",
                "semester", "academic_year", "regulation", "exam_type", "set_label", "status", "stage", "content",
                "trail", "faculty_username", "faculty_name", "coe_reference_no", "chief_seal_no", "remarks", "pdf_name",
                "pdf_size", "version", "created_at", "updated_at")) {
            m.put(col, col.endsWith("_at") ? rs.getObject(col, OffsetDateTime.class) : rs.getObject(col));
        }
        return m;
    }

    /** The paper in the screens' QuestionPaperItem shape (the stored content plus the server-owned fields). */
    private Map<String, Object> view(Map<String, Object> p) {
        Map<String, Object> v = new LinkedHashMap<>(content(p));
        long id = ((Number) p.get("id")).longValue();
        List<Map<String, Object>> trail = trail(p);
        int stage = ((Number) p.get("stage")).intValue();
        String status = (String) p.get("status");
        OffsetDateTime created = (OffsetDateTime) p.get("created_at");
        v.put("id", String.valueOf(id));
        v.put("serverId", id);
        v.put("version", p.get("version"));
        v.put("qpCode", "KVELL/" + abbreviation((String) p.get("exam_type")) + "/" + p.get("academic_year").toString()
                .replace(" ", "") + "/" + p.get("subject_code") + "-" + ((String) p.get("set_label")).replace("Set ", ""));
        v.put("subjectCode", p.get("subject_code"));
        v.put("subjectTitle", p.get("subject_title"));
        v.put("department", p.get("dept_name"));
        v.put("deptKey", p.get("dept_key"));
        v.put("facultyName", p.get("faculty_name"));
        v.put("hodName", officer(trail, 2));
        v.put("adName", officer(trail, 3));
        v.put("coeName", officer(trail, 4));
        v.put("chiefCoeName", officer(trail, 5));
        v.put("currentStageNumber", stage);
        v.put("currentStageRole", STAGE_ROLES.get(stage - 1));
        v.put("status", status);
        v.put("semester", Semesters.label(((Number) p.get("semester")).intValue()));
        v.put("academicYear", p.get("academic_year"));
        v.put("regulation", p.get("regulation"));
        v.put("examType", p.get("exam_type"));
        v.put("set", p.get("set_label"));
        v.put("dateSubmitted", created.atZoneSameInstant(IST).format(DATE));
        v.put("timeSubmitted", created.atZoneSameInstant(IST).format(TIME));
        boolean atCoe = stage >= 4 || "CHIEF_COE_APPROVED".equals(status);
        v.put("forwardedToCoe", atCoe);
        if (atCoe) v.put("forwardedDate", stamp(trail, 3));
        if (p.get("coe_reference_no") != null) v.put("coeReferenceNo", p.get("coe_reference_no"));
        if (p.get("chief_seal_no") != null) {
            v.put("chiefCoeSealNo", p.get("chief_seal_no"));
            v.put("approvedBy", officer(trail, 5));
        }
        v.put("hierarchyTrail", trail);
        if (p.get("pdf_name") != null) {
            Map<String, Object> att = new LinkedHashMap<>();
            att.put("fileName", p.get("pdf_name"));
            int size = p.get("pdf_size") == null ? 0 : ((Number) p.get("pdf_size")).intValue();
            att.put("fileSize", Math.max(1, size / 1024) + " KB");
            // The screens fetch the file on demand from /api/v1/question-papers/{id}/pdf
            att.put("fileData", "server-pdf:" + id);
            att.put("serverPdf", true);
            att.put("uploadedAt", v.get("dateSubmitted"));
            v.put("pdfAttachment", att);
        } else {
            v.remove("pdfAttachment");
        }
        return v;
    }

    private static String abbreviation(String examType) {
        return switch (examType) {
            case "Internal Assessment - I" -> "IA1";
            case "Internal Assessment - II" -> "IA2";
            case "Model Examination" -> "MODEL";
            default -> "ESE";
        };
    }

    private static String officer(List<Map<String, Object>> trail, int stage) {
        Object name = trail.get(stage - 1).get("officerName");
        return name == null ? "" : name.toString();
    }

    private static String stamp(List<Map<String, Object>> trail, int stage) {
        Object t = trail.get(stage - 1).get("timestamp");
        return t == null ? null : t.toString();
    }

    private static List<Map<String, Object>> emptyTrail() {
        List<Map<String, Object>> trail = new ArrayList<>();
        String[] titles = {"Faculty", "Head of Department", "Associate Dean", "Controller of Examinations", "Chief COE"};
        for (int s = 1; s <= 5; s++) {
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("stageNumber", s);
            e.put("stageRole", STAGE_ROLES.get(s - 1));
            e.put("officerTitle", titles[s - 1]);
            e.put("officerName", "");
            e.put("status", "PENDING");
            trail.add(e);
        }
        return trail;
    }

    private static void sign(List<Map<String, Object>> trail, int stage, CurrentUser user, String status, String seal,
                             String remarks) {
        Map<String, Object> e = trail.get(stage - 1);
        e.put("officerName", user.name());
        e.put("status", status);
        e.put("timestamp", OffsetDateTime.now(IST).format(DateTimeFormatter.ofPattern("MMM d, yyyy hh:mm a", Locale.ENGLISH)));
        if (seal != null) e.put("sealOrReference", seal);
        if (remarks != null) e.put("remarks", remarks);
    }

    private static void mark(List<Map<String, Object>> trail, int stage, String status) {
        trail.get(stage - 1).put("status", status);
    }

    private void announce(String deptKey, int stage, String title, String message) {
        Audience audience = switch (stage) {
            case 1 -> Audience.FACULTY;
            case 2 -> Audience.HOD;
            case 3 -> Audience.DEAN;
            default -> Audience.COE;
        };
        notifications.notify(audience, deptKey, null, title, message, "question-paper");
    }

    // ---------------------------------------------------------------- input

    private record Clean(String code, String title, int semester, String academicYear, String regulation,
                         String examType, String set, Map<String, Object> content, byte[] pdf, String pdfName,
                         String remarks) {
    }

    private Clean clean(PaperInput in) {
        if (in == null) throw ApiException.badRequest("Question paper details are required");
        String code = text(in.subjectCode(), "Subject code", 2, 20).toUpperCase(Locale.ROOT);
        String title = text(in.subjectTitle(), "Subject title", 2, 160);
        int sem = Semesters.parse(in.semester());
        String ay = text(in.academicYear(), "Academic year", 4, 20);
        String reg = text(in.regulation() == null || in.regulation().isBlank() ? "Regulation 2021" : in.regulation(),
                "Regulation", 2, 60);
        String exam = text(in.examType(), "Exam type", 2, 40);
        if (!EXAM_TYPES.contains(exam)) throw ApiException.badRequest("Unknown exam type: " + exam);
        String set = cleanSet(in.set());
        Map<String, Object> content = in.content() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(in.content());
        // Fields the server owns are never taken from the client
        for (String k : List.of("id", "serverId", "version", "status", "currentStageNumber", "currentStageRole",
                "hierarchyTrail", "coeReferenceNo", "chiefCoeSealNo", "approvedBy", "pdfAttachment", "forwardedToCoe",
                "forwardedDate", "facultyName", "hodName", "adName", "coeName", "chiefCoeName", "department", "deptKey")) {
            content.remove(k);
        }
        String text = write(content);
        if (text.length() > MAX_CONTENT_CHARS) throw ApiException.badRequest("The question paper content is too large");
        byte[] pdf = null;
        String pdfName = null;
        if (in.pdf() != null && in.pdf().dataUrl() != null && !in.pdf().dataUrl().isBlank()) {
            String url = in.pdf().dataUrl();
            int comma = url.indexOf(',');
            if (!url.startsWith("data:application/pdf") || comma < 0) {
                throw ApiException.badRequest("The question paper must be a PDF file");
            }
            try {
                pdf = Base64.getDecoder().decode(url.substring(comma + 1));
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("The PDF could not be read");
            }
            if (pdf.length > MAX_PDF_BYTES) throw ApiException.badRequest("The PDF is larger than 15 MB");
            if (pdf.length < 5 || !new String(pdf, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) {
                throw ApiException.badRequest("The file is not a PDF");
            }
            pdfName = text(in.pdf().fileName() == null ? "question-paper.pdf" : in.pdf().fileName(), "File name", 1, 200);
        }
        String remarks = in.remarks() == null || in.remarks().isBlank() ? null : text(in.remarks(), "Remarks", 1, 500);
        return new Clean(code, title, sem, ay, reg, exam, set, content, pdf, pdfName, remarks);
    }

    private static String cleanSet(String set) {
        String s = set == null ? "Set A" : set.trim();
        if (!s.equals("Set A") && !s.equals("Set B")) throw ApiException.badRequest("The set must be Set A or Set B");
        return s;
    }

    private static String text(String v, String field, int min, int max) {
        String t = v == null ? "" : v.trim();
        if (t.length() < min || t.length() > max) throw ApiException.badRequest(field + ": " + min + "-" + max + " characters");
        return t;
    }

    private Map<String, Object> content(Map<String, Object> p) {
        return read(p.get("content"), new TypeReference<LinkedHashMap<String, Object>>() { });
    }

    private List<Map<String, Object>> trail(Map<String, Object> p) {
        List<Map<String, Object>> t = read(p.get("trail"), new TypeReference<ArrayList<Map<String, Object>>>() { });
        return t.size() == 5 ? t : emptyTrail();
    }

    private <T> T read(Object value, TypeReference<T> type) {
        try {
            return json.readValue(value == null ? "null" : value.toString(), type);
        } catch (Exception e) {
            throw new IllegalStateException("Stored question paper data is not valid JSON", e);
        }
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
