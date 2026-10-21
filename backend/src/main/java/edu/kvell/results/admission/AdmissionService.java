package edu.kvell.results.admission;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
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
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * Admission applicants of a college, kept on the server (personal data never stays in the browser). An admission
 * officer works on their own college only; the Chief COE may open any college. The Aadhaar number is stored once
 * and only ever returned masked (last four digits); scanned documents are stored separately and every opening of
 * one is recorded in the audit log.
 */
@Service
public class AdmissionService {

    public record Document(String fileName, String fileType, byte[] bytes) {
    }

    static final Set<String> STATUSES = Set.of("DRAFT", "PENDING_VERIFICATION", "DOCS_VERIFIED", "ADMITTED", "REJECTED");
    static final Set<String> QUOTAS = Set.of("ENTRANCE_QUOTA", "MANAGEMENT_QUOTA");
    static final Set<String> DEGREES = Set.of("UG", "PG", "Ph.D.");
    static final Map<String, String> KINDS = Map.of("aadhar", "AADHAAR", "tenth", "TENTH", "twelfth", "TWELFTH");
    static final Set<String> FILE_TYPES = Set.of("application/pdf", "image/png", "image/jpeg");
    static final int MAX_FILE_BYTES = 15 * 1024 * 1024;
    static final int MAX_DETAILS_CHARS = 50_000;
    /** Fields kept in their own columns (or owned by the server), never in the details JSON. */
    private static final Set<String> SERVER_FIELDS = Set.of("id", "applicationNo", "regNo", "fullName", "dob",
            "deptKey", "deptName", "degreeLevel", "admissionYear", "quota", "status", "createdAt", "updatedAt",
            "admittedAt", "collegeKey", "version");

    private final JdbcClient db;
    private final AuditService audit;
    private final ObjectMapper json;

    public AdmissionService(JdbcClient db, AuditService audit, ObjectMapper json) {
        this.db = db;
        this.audit = audit;
        this.json = json;
    }

    // ---------------------------------------------------------------- reading

    public List<Map<String, Object>> list(String collegeParam, CurrentUser user) {
        String college = college(collegeParam, user);
        List<Map<String, Object>> rows = db.sql("SELECT * FROM admission_applicants WHERE college_key = ? ORDER BY created_at DESC")
                .params(college).query().listOfRows();
        Map<Long, List<Map<String, Object>>> docs = new LinkedHashMap<>();
        db.sql("""
                        SELECT d.applicant_id, d.kind, d.file_name, d.file_type, d.file_size, d.uploaded_at
                        FROM admission_documents d JOIN admission_applicants a ON a.id = d.applicant_id
                        WHERE a.college_key = ?
                        """)
                .params(college).query().listOfRows()
                .forEach(d -> docs.computeIfAbsent(((Number) d.get("applicant_id")).longValue(), k -> new ArrayList<>()).add(d));
        return rows.stream().map(r -> view(r, docs.getOrDefault(((Number) r.get("id")).longValue(), List.of()))).toList();
    }

    public Map<String, Object> get(long id, CurrentUser user) {
        Map<String, Object> row = load(id, user);
        return view(row, documents(id));
    }

    /** A scanned document; every opening is recorded (they carry personal data). */
    public Document document(long id, String kind, CurrentUser user, String ip) {
        Map<String, Object> row = load(id, user);
        String k = kind(kind);
        Document doc = db.sql("SELECT file_name, file_type, file FROM admission_documents WHERE applicant_id = ? AND kind = ?")
                .params(id, k)
                .query((rs, n) -> new Document(rs.getString("file_name"), rs.getString("file_type"), rs.getBytes("file")))
                .optional().orElseThrow(() -> ApiException.notFound("Document not found"));
        audit.record(user.username(), user.name(), "VIEWED_ADMISSION_DOCUMENT", row.get("application_no") + " " + k,
                "Opened the " + k.toLowerCase(Locale.ROOT) + " document of applicant " + row.get("application_no") + ".", ip);
        return doc;
    }

    // ---------------------------------------------------------------- changing

    @Transactional
    public Map<String, Object> create(Map<String, Object> body, String collegeParam, CurrentUser user, String ip) {
        String college = college(collegeParam, user);
        Clean c = clean(body, null);
        long id = db.sql("""
                        INSERT INTO admission_applicants (college_key, application_no, reg_no, full_name, dob, dept_code,
                            dept_name, degree_level, admission_year, quota, status, aadhaar, details, created_by,
                            admitted_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSONB), ?,
                                CASE WHEN ? = 'ADMITTED' THEN now() END)
                        RETURNING id
                        """)
                .params(college, "P-" + java.util.UUID.randomUUID().toString().replace("-", ""), c.regNo(), c.fullName(), c.dob(), c.deptCode(),
                        c.deptName(), c.degree(), c.year(), c.quota(), c.status(), c.aadhaar(), c.details(),
                        user.username(), c.status())
                .query(Long.class).single();
        // The application number is the server's: college, year and a running number
        String appNo = "KVELL/" + college.substring(0, 3).toUpperCase(Locale.ROOT) + "/" + c.year() + "/" + String.format("%05d", id);
        db.sql("UPDATE admission_applicants SET application_no = ? WHERE id = ?").params(appNo, id).update();
        audit.record(user.username(), user.name(), "CREATED_ADMISSION_APPLICANT", appNo,
                "Registered applicant " + appNo + " for " + c.deptName() + " (" + c.degree() + ", " + c.year() + ").", ip);
        return get(id, user);
    }

    @Transactional
    public Map<String, Object> update(long id, Map<String, Object> body, CurrentUser user, String ip) {
        Map<String, Object> row = load(id, user);
        Object expected = body == null ? null : body.get("version");
        if (expected instanceof Number v && v.intValue() != ((Number) row.get("version")).intValue()) {
            throw ApiException.conflict("Someone else changed this applicant just now. Reload and try again.");
        }
        Clean c = clean(body, row);
        String before = (String) row.get("status");
        db.sql("""
                        UPDATE admission_applicants SET reg_no = ?, full_name = ?, dob = ?, dept_code = ?, dept_name = ?,
                            degree_level = ?, admission_year = ?, quota = ?, status = ?, aadhaar = ?,
                            details = CAST(? AS JSONB), version = version + 1, updated_at = now(),
                            admitted_at = CASE WHEN ? = 'ADMITTED' THEN coalesce(admitted_at, now()) ELSE NULL END
                        WHERE id = ?
                        """)
                .params(c.regNo(), c.fullName(), c.dob(), c.deptCode(), c.deptName(), c.degree(), c.year(), c.quota(),
                        c.status(), c.aadhaar(), c.details(), c.status(), id)
                .update();
        String appNo = (String) row.get("application_no");
        audit.record(user.username(), user.name(), "UPDATED_ADMISSION_APPLICANT", appNo,
                "Updated applicant " + appNo + (before.equals(c.status()) ? "." : " (" + before + " -> " + c.status() + ")."),
                ip, before, c.status());
        return get(id, user);
    }

    @Transactional
    public void delete(long id, CurrentUser user, String ip) {
        Map<String, Object> row = load(id, user);
        if ("ADMITTED".equals(row.get("status"))) {
            throw ApiException.conflict("An admitted student cannot be deleted");
        }
        db.sql("DELETE FROM admission_applicants WHERE id = ?").params(id).update();
        audit.record(user.username(), user.name(), "DELETED_ADMISSION_APPLICANT", (String) row.get("application_no"),
                "Deleted applicant " + row.get("application_no") + ".", ip);
    }

    /** Stores (or replaces) a scanned document: a PDF, PNG or JPEG of at most 15 MB, checked by its content. */
    @Transactional
    public Map<String, Object> putDocument(long id, String kind, Map<String, String> body, CurrentUser user, String ip) {
        Map<String, Object> row = load(id, user);
        String k = kind(kind);
        String dataUrl = body == null ? null : body.get("dataUrl");
        if (dataUrl == null || !dataUrl.startsWith("data:") || !dataUrl.contains(",")) {
            throw ApiException.badRequest("The document is missing");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(dataUrl.substring(dataUrl.indexOf(',') + 1));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("The document could not be read");
        }
        if (bytes.length == 0 || bytes.length > MAX_FILE_BYTES) throw ApiException.badRequest("Documents must be at most 15 MB");
        String type = sniff(bytes);
        if (type == null) throw ApiException.badRequest("Upload a PDF, PNG or JPEG file");
        String name = body.getOrDefault("fileName", "document").trim();
        if (name.isEmpty() || name.length() > 200) name = "document";
        db.sql("""
                        INSERT INTO admission_documents (applicant_id, kind, file, file_name, file_type, file_size, uploaded_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (applicant_id, kind) DO UPDATE SET file = EXCLUDED.file, file_name = EXCLUDED.file_name,
                            file_type = EXCLUDED.file_type, file_size = EXCLUDED.file_size,
                            uploaded_by = EXCLUDED.uploaded_by, uploaded_at = now()
                        """)
                .params(id, k, bytes, name, type, bytes.length, user.username()).update();
        audit.record(user.username(), user.name(), "UPLOADED_ADMISSION_DOCUMENT", row.get("application_no") + " " + k,
                "Uploaded the " + k.toLowerCase(Locale.ROOT) + " document of applicant " + row.get("application_no") + ".", ip);
        return get(id, user);
    }

    // ---------------------------------------------------------------- rules

    /** The officer's own college; the Chief COE names the college (any of the three). */
    private String college(String requested, CurrentUser user) {
        if (user.role() == Role.SUPER_ADMIN) {
            String c = requested == null ? "" : requested.trim().toLowerCase(Locale.ROOT);
            if (!Departments.COLLEGES.contains(c)) throw ApiException.badRequest("Choose the college");
            return c;
        }
        if (user.role() != Role.ADMISSION || user.collegeKey() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admissions are handled by the college's admission officer");
        }
        if (requested != null && !requested.isBlank() && !requested.trim().equalsIgnoreCase(user.collegeKey())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only open your own college's admissions");
        }
        return user.collegeKey();
    }

    private Map<String, Object> load(long id, CurrentUser user) {
        Map<String, Object> row = db.sql("SELECT * FROM admission_applicants WHERE id = ?").params(id).query().listOfRows()
                .stream().findFirst().orElseThrow(() -> ApiException.notFound("Applicant not found"));
        String college = (String) row.get("college_key");
        if (user.role() == Role.SUPER_ADMIN) return row;
        if (user.role() != Role.ADMISSION || !college.equals(user.collegeKey())) {
            throw ApiException.notFound("Applicant not found");
        }
        return row;
    }

    private record Clean(String regNo, String fullName, LocalDate dob, String deptCode, String deptName, String degree,
                         int year, String quota, String status, String aadhaar, String details) {
    }

    /** Validates an applicant; existing is the stored row on an update (its Aadhaar is kept unless a new one is typed). */
    @SuppressWarnings("unchecked")
    private Clean clean(Map<String, Object> body, Map<String, Object> existing) {
        if (body == null) throw ApiException.badRequest("Applicant details are required");
        String fullName = text(body.get("fullName"), "Full name", 2, 160);
        LocalDate dob = null;
        String dobText = str(body.get("dob"));
        if (!dobText.isEmpty()) {
            try {
                dob = LocalDate.parse(dobText.length() > 10 ? dobText.substring(0, 10) : dobText);
            } catch (DateTimeParseException e) {
                throw ApiException.badRequest("Date of birth must be a date (yyyy-mm-dd)");
            }
            if (dob.isAfter(LocalDate.now()) || dob.isBefore(LocalDate.now().minusYears(80))) {
                throw ApiException.badRequest("Check the date of birth");
            }
        }
        String deptCode = text(body.get("deptKey"), "Programme", 1, 10);
        String deptName = text(body.get("deptName"), "Programme name", 2, 160);
        String degree = str(body.get("degreeLevel"));
        if (!DEGREES.contains(degree)) throw ApiException.badRequest("Degree level must be UG, PG or Ph.D.");
        int year;
        try {
            year = Integer.parseInt(str(body.get("admissionYear")));
        } catch (NumberFormatException e) {
            throw ApiException.badRequest("Admission year is required");
        }
        if (year < 2000 || year > LocalDate.now().getYear() + 1) throw ApiException.badRequest("Check the admission year");
        String quota = str(body.get("quota"));
        if ("MANAGEMENT".equals(quota)) quota = "MANAGEMENT_QUOTA";
        if (!QUOTAS.contains(quota)) throw ApiException.badRequest("Quota must be Entrance or Management");
        String status = str(body.get("status"));
        if (status.isEmpty()) status = "PENDING_VERIFICATION";
        if (!STATUSES.contains(status)) throw ApiException.badRequest("Unknown status: " + status);
        String regNo = str(body.get("regNo"));
        if (regNo.isEmpty()) {
            regNo = null;
        } else if (!regNo.matches("\\d{6,20}")) {
            throw ApiException.badRequest("Register number: 6-20 digits");
        } else {
            Long other = db.sql("SELECT id FROM admission_applicants WHERE reg_no = ?").params(regNo).query(Long.class)
                    .optional().orElse(null);
            long self = existing == null ? -1 : ((Number) existing.get("id")).longValue();
            Long student = db.sql("SELECT 1 FROM students WHERE reg_no = ?").params(regNo).query(Long.class).optional().orElse(null);
            if ((other != null && other != self) || student != null) {
                throw ApiException.conflict("Register number " + regNo + " is already used");
            }
        }
        if ("ADMITTED".equals(status) && regNo == null) {
            throw ApiException.badRequest("Assign the register number before admitting the student");
        }

        Map<String, Object> details = new LinkedHashMap<>(body);
        SERVER_FIELDS.forEach(details::remove);
        // Aadhaar: a newly typed 12-digit number replaces the stored one; a masked one keeps it
        String aadhaar = existing == null ? null : (String) existing.get("aadhaar");
        if (details.get("aadhar") instanceof Map<?, ?> a) {
            Map<String, Object> aad = new LinkedHashMap<>((Map<String, Object>) a);
            String typed = str(aad.get("aadharNumber")).replaceAll("[\\s-]", "");
            if (typed.matches("\\d{12}")) {
                if (!AadhaarCheck.valid(typed)) throw ApiException.badRequest("The Aadhaar number is not valid");
                aadhaar = typed;
            } else if (!typed.isEmpty() && !typed.matches("X{8}\\d{4}")) {
                throw ApiException.badRequest("The Aadhaar number must have 12 digits");
            }
            aad.remove("aadharNumber");
            details.put("aadhar", aad);
        }
        // Documents live in their own table: drop file contents from the details
        for (String section : List.of("aadhar", "tenthMarks", "twelfthMarks")) {
            if (details.get(section) instanceof Map<?, ?> m) {
                Map<String, Object> copy = new LinkedHashMap<>((Map<String, Object>) m);
                copy.remove("document");
                details.put(section, copy);
            }
        }
        String text = write(details);
        if (text.length() > MAX_DETAILS_CHARS) throw ApiException.badRequest("The application details are too large");
        return new Clean(regNo, fullName, dob, deptCode, deptName, degree, year, quota, status, aadhaar, text);
    }

    /** The applicant as the screens use it (StudentApplicant): stored details plus the server's fields. */
    @SuppressWarnings("unchecked")
    private Map<String, Object> view(Map<String, Object> r, List<Map<String, Object>> docs) {
        Map<String, Object> v = new LinkedHashMap<>(read(r.get("details")));
        long id = ((Number) r.get("id")).longValue();
        v.put("id", String.valueOf(id));
        v.put("version", r.get("version"));
        v.put("applicationNo", r.get("application_no"));
        v.put("regNo", r.get("reg_no") == null ? "" : r.get("reg_no"));
        v.put("fullName", r.get("full_name"));
        v.put("dob", r.get("dob") == null ? "" : r.get("dob").toString());
        v.put("collegeKey", r.get("college_key"));
        v.put("deptKey", r.get("dept_code"));
        v.put("deptName", r.get("dept_name"));
        v.put("degreeLevel", r.get("degree_level"));
        v.put("admissionYear", ((Number) r.get("admission_year")).intValue());
        v.put("quota", r.get("quota"));
        v.put("status", r.get("status"));
        v.put("createdAt", stamp(r.get("created_at")));
        v.put("updatedAt", stamp(r.get("updated_at")));
        if (r.get("admitted_at") != null) v.put("admittedAt", stamp(r.get("admitted_at")));
        Map<String, Object> aad = v.get("aadhar") instanceof Map<?, ?> a ? new LinkedHashMap<>((Map<String, Object>) a) : new LinkedHashMap<>();
        String aadhaar = (String) r.get("aadhaar");
        aad.put("aadharNumber", aadhaar == null ? "" : "XXXXXXXX" + aadhaar.substring(8));
        v.put("aadhar", aad);
        for (Map<String, Object> d : docs) {
            String section = switch ((String) d.get("kind")) {
                case "AADHAAR" -> "aadhar";
                case "TENTH" -> "tenthMarks";
                default -> "twelfthMarks";
            };
            Map<String, Object> s = v.get(section) instanceof Map<?, ?> m ? new LinkedHashMap<>((Map<String, Object>) m) : new LinkedHashMap<>();
            Map<String, Object> doc = new LinkedHashMap<>();
            doc.put("fileName", d.get("file_name"));
            doc.put("fileSize", d.get("file_size"));
            doc.put("fileType", d.get("file_type"));
            // The screens fetch the file on demand from /api/v1/admission/applicants/{id}/documents/{kind}
            doc.put("dataUrl", "server-doc:" + id + ":" + section);
            doc.put("uploadedAt", stamp(d.get("uploaded_at")));
            s.put("document", doc);
            v.put(section, s);
        }
        return v;
    }

    private List<Map<String, Object>> documents(long id) {
        return db.sql("SELECT kind, file_name, file_type, file_size, uploaded_at FROM admission_documents WHERE applicant_id = ?")
                .params(id).query().listOfRows();
    }

    private static String kind(String kind) {
        String k = KINDS.get(kind == null ? "" : kind.trim());
        if (k == null) throw ApiException.badRequest("Document must be aadhar, tenth or twelfth");
        return k;
    }

    /** The real type of an uploaded file from its first bytes (the browser's label is not trusted). */
    static String sniff(byte[] b) {
        if (b.length >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') return "application/pdf";
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "image/png";
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "image/jpeg";
        return null;
    }

    private static String stamp(Object t) {
        return t instanceof OffsetDateTime o ? o.toString() : t instanceof java.sql.Timestamp ts ? ts.toInstant().toString()
                : t == null ? null : t.toString();
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    private static String text(Object o, String field, int min, int max) {
        String t = str(o);
        if (t.length() < min || t.length() > max) throw ApiException.badRequest(field + ": " + min + "-" + max + " characters");
        return t;
    }

    private Map<String, Object> read(Object value) {
        try {
            return json.readValue(value == null ? "{}" : value.toString(), new TypeReference<LinkedHashMap<String, Object>>() { });
        } catch (Exception e) {
            throw new IllegalStateException("Stored applicant details are not valid JSON", e);
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
