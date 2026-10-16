package edu.kvell.results.facultymaster;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.common.Departments;
import edu.kvell.results.common.Semesters;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Period;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

/**
 * Faculty master (Faculty Detail): Basic Details, Employment History and Course Offered for every faculty member of a
 * college. Each college's COE adds and edits its own faculty; the Chief COE only views them (GovernanceFilter refuses
 * its changes). Every query is limited to the signed-in user's college.
 */
@RestController
@RequestMapping("/api/admin/faculty-master")
public class FacultyMasterController {

    public record Address(String doorNo, String street, String city, String country, String state, String district,
                          String pincode) {
    }

    /** A qualification at the time of joining, e.g. M.E. / Computer Science, completed 2015-05. */
    public record Qualification(String qualification, String discipline, String completedOn) {
    }

    /** section: ENGINEERING (teaching), INDUSTRIAL or POLYTECHNIC. Dates are yyyy-MM-dd; a blank to date means till date. */
    public record Employment(String section, String designation, String organisation, String location, String from,
                             String to) {
    }

    /** kind: THEORY or PRACTICAL. */
    public record CourseOffered(String kind, String branch, String course, Integer timesOffered) {
    }

    public record FacultyInput(String title, String name, String relationName, String dept, String gender, String dob,
                               String designation, String joinedServiceOn, String joinedPostOn, String aadhaar,
                               Address commAddress, Address permAddress, String residentialPhone, String mobile,
                               String email, List<Qualification> qualifications, List<Employment> employment,
                               List<CourseOffered> courses) {
    }

    /** Total experience per employment section, then THIS_COLLEGE (joining service to today) and TOTAL. */
    public record Experience(String section, int years, int months) {
    }

    public record FacultySummary(long id, String title, String name, String deptKey, String deptName,
                                 String designation, String gender, String mobile, String email, String joinedServiceOn,
                                 Experience totalExperience, boolean hasPhoto, String updatedAt) {
    }

    /** aadhaar is masked (last four digits) for the Chief COE, who only views the record. */
    public record FacultyDetail(long id, String title, String name, String relationName, String deptKey,
                                String deptName, String gender, String dob, String designation, String joinedServiceOn,
                                String joinedPostOn, String aadhaar, Address commAddress, Address permAddress,
                                String residentialPhone, String mobile, String email,
                                List<Qualification> qualifications, List<Employment> employment,
                                List<CourseOffered> courses, List<Experience> experience, boolean hasPhoto,
                                boolean hasSignature, String createdBy, String updatedBy, String updatedAt) {
    }

    static final Set<String> TITLES = Set.of("Dr.", "Mr.", "Ms.");
    static final Set<String> GENDERS = Set.of("Male", "Female", "Other");
    static final List<String> SECTIONS = List.of("ENGINEERING", "INDUSTRIAL", "POLYTECHNIC");
    static final Set<String> COURSE_KINDS = Set.of("THEORY", "PRACTICAL");
    private static final Map<String, Long> IMAGE_LIMITS = Map.of("photo", 500L * 1024, "signature", 200L * 1024);
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};

    private final JdbcClient db;
    private final Departments departments;
    private final AuditService audit;
    private final ObjectMapper json;

    public FacultyMasterController(JdbcClient db, Departments departments, AuditService audit, ObjectMapper json) {
        this.db = db;
        this.departments = departments;
        this.audit = audit;
        this.json = json;
    }

    @GetMapping
    List<FacultySummary> list(@RequestParam(required = false) String dept) {
        String deptKey = dept == null || dept.isBlank() ? null : departments.key(dept);
        return db.sql("""
                        SELECT f.id, f.title, f.name, f.dept_key, d.name AS dept_name, f.designation, f.gender,
                               f.mobile, f.email, f.joined_service_on, f.employment, f.photo IS NOT NULL AS has_photo,
                               f.updated_at
                        FROM faculty_master f JOIN departments d ON d.dept_key = f.dept_key
                        WHERE f.college_key = :college AND (CAST(:dept AS VARCHAR) IS NULL OR f.dept_key = :dept)
                        ORDER BY d.name, f.name
                        """)
                .param("college", departments.college()).param("dept", deptKey)
                .query((rs, n) -> {
                    LocalDate joined = rs.getObject("joined_service_on", LocalDate.class);
                    int months = overallMonths(employmentRows(rs.getString("employment")), joined, LocalDate.now());
                    return new FacultySummary(rs.getLong("id"), rs.getString("title"), rs.getString("name"),
                            rs.getString("dept_key"), rs.getString("dept_name"), rs.getString("designation"),
                            rs.getString("gender"), rs.getString("mobile"), rs.getString("email"),
                            rs.getObject("joined_service_on", LocalDate.class).toString(),
                            new Experience("TOTAL", months / 12, months % 12), rs.getBoolean("has_photo"),
                            Semesters.display(rs.getObject("updated_at", OffsetDateTime.class)));
                })
                .list();
    }

    @GetMapping("/{id}")
    FacultyDetail get(@PathVariable long id) {
        boolean mask = CurrentUser.get().role() == CurrentUser.Role.SUPER_ADMIN;
        return db.sql("""
                        SELECT f.*, d.name AS dept_name, f.photo IS NOT NULL AS has_photo,
                               f.signature IS NOT NULL AS has_signature
                        FROM faculty_master f JOIN departments d ON d.dept_key = f.dept_key
                        WHERE f.id = ? AND f.college_key = ?
                        """)
                .params(id, departments.college())
                .query((rs, n) -> detail(rs, mask)).optional()
                .orElseThrow(() -> ApiException.notFound("Faculty record not found"));
    }

    @PostMapping
    @Transactional
    FacultyDetail create(@RequestBody FacultyInput in, HttpServletRequest http) {
        Clean c = validate(in, null);
        CurrentUser user = CurrentUser.get();
        long id = db.sql("""
                        INSERT INTO faculty_master (college_key, dept_key, title, name, relation_name, gender, dob,
                            designation, joined_service_on, joined_post_on, aadhaar, comm_address, perm_address,
                            residential_phone, mobile, email, qualifications, employment, courses, created_by,
                            updated_by)
                        VALUES (:college, :dept, :title, :name, :relation, :gender, :dob, :designation, :joinedService,
                            :joinedPost, :aadhaar, CAST(:comm AS jsonb), CAST(:perm AS jsonb), :resPhone, :mobile,
                            :email, CAST(:quals AS jsonb), CAST(:employment AS jsonb), CAST(:courses AS jsonb), :by, :by)
                        RETURNING id
                        """)
                .params(c.params(departments.college(), user.name()))
                .query(Long.class).single();
        audit.record(user.username(), user.name(), "ADDED_FACULTY", c.title + " " + c.name,
                "Added faculty " + c.title + " " + c.name + " (" + c.deptKey.toUpperCase() + ", " + c.designation
                        + ") to the faculty master.", http.getRemoteAddr());
        return get(id);
    }

    @PutMapping("/{id}")
    @Transactional
    FacultyDetail update(@PathVariable long id, @RequestBody FacultyInput in, HttpServletRequest http) {
        String college = departments.college();
        requireExists(id, college);
        Clean c = validate(in, id);
        CurrentUser user = CurrentUser.get();
        Map<String, Object> p = c.params(college, user.name());
        p.put("id", id);
        db.sql("""
                        UPDATE faculty_master SET dept_key = :dept, title = :title, name = :name,
                            relation_name = :relation, gender = :gender, dob = :dob, designation = :designation,
                            joined_service_on = :joinedService, joined_post_on = :joinedPost, aadhaar = :aadhaar,
                            comm_address = CAST(:comm AS jsonb), perm_address = CAST(:perm AS jsonb),
                            residential_phone = :resPhone, mobile = :mobile, email = :email,
                            qualifications = CAST(:quals AS jsonb), employment = CAST(:employment AS jsonb),
                            courses = CAST(:courses AS jsonb), updated_by = :by, updated_at = now()
                        WHERE id = :id AND college_key = :college
                        """)
                .params(p).update();
        audit.record(user.username(), user.name(), "UPDATED_FACULTY", c.title + " " + c.name,
                "Updated the faculty master record of " + c.title + " " + c.name + ".", http.getRemoteAddr());
        return get(id);
    }

    @DeleteMapping("/{id}")
    @Transactional
    ResponseEntity<Void> delete(@PathVariable long id, HttpServletRequest http) {
        String college = departments.college();
        String name = db.sql("SELECT title || ' ' || name FROM faculty_master WHERE id = ? AND college_key = ?")
                .params(id, college).query(String.class).optional()
                .orElseThrow(() -> ApiException.notFound("Faculty record not found"));
        db.sql("DELETE FROM faculty_master WHERE id = ? AND college_key = ?").params(id, college).update();
        CurrentUser user = CurrentUser.get();
        audit.record(user.username(), user.name(), "DELETED_FACULTY", name,
                "Removed " + name + " from the faculty master.", http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    /** Uploads (or replaces) the photo or signature: JPEG or PNG, photo up to 500 KB, signature up to 200 KB. */
    @PostMapping(path = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    ResponseEntity<Void> uploadImage(@PathVariable long id, @RequestParam String kind,
                                     @RequestParam("file") MultipartFile file, HttpServletRequest http)
            throws IOException {
        String k = imageKind(kind);
        requireExists(id, departments.college());
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Choose an image to upload");
        long limit = IMAGE_LIMITS.get(k);
        if (file.getSize() > limit) {
            throw ApiException.badRequest("The " + k + " must be " + limit / 1024 + " KB or smaller");
        }
        byte[] content = file.getBytes();
        String type = startsWith(content, JPEG) ? MediaType.IMAGE_JPEG_VALUE
                : startsWith(content, PNG) ? MediaType.IMAGE_PNG_VALUE : null;
        if (type == null) throw ApiException.badRequest("Only JPEG or PNG images can be uploaded");
        // k is one of two fixed column names, so inlining it is safe
        db.sql("UPDATE faculty_master SET " + k + " = ?, " + k + "_type = ?, updated_at = now() "
                        + "WHERE id = ? AND college_key = ?")
                .params(content, type, id, departments.college()).update();
        CurrentUser user = CurrentUser.get();
        audit.record(user.username(), user.name(), "UPLOADED_FACULTY_" + k.toUpperCase(), "Faculty #" + id,
                "Uploaded the faculty " + k + " (" + content.length / 1024 + " KB).", http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/image")
    ResponseEntity<byte[]> image(@PathVariable long id, @RequestParam String kind) {
        String k = imageKind(kind);
        record Image(byte[] content, String type) {
        }
        Image img = db.sql("SELECT " + k + " AS content, " + k + "_type AS type FROM faculty_master "
                        + "WHERE id = ? AND college_key = ?")
                .params(id, departments.college())
                .query((rs, n) -> new Image(rs.getBytes("content"), rs.getString("type"))).optional()
                .filter(i -> i.content() != null)
                .orElseThrow(() -> ApiException.notFound("No " + k + " uploaded"));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(img.type()))
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(img.content());
    }

    @DeleteMapping("/{id}/image")
    @Transactional
    ResponseEntity<Void> deleteImage(@PathVariable long id, @RequestParam String kind, HttpServletRequest http) {
        String k = imageKind(kind);
        requireExists(id, departments.college());
        db.sql("UPDATE faculty_master SET " + k + " = NULL, " + k + "_type = NULL WHERE id = ? AND college_key = ?")
                .params(id, departments.college()).update();
        CurrentUser user = CurrentUser.get();
        audit.record(user.username(), user.name(), "REMOVED_FACULTY_" + k.toUpperCase(), "Faculty #" + id,
                "Removed the faculty " + k + ".", http.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    // ---------------------------------------------------------------- validation

    private final class Clean {
        String deptKey, title, name, relation, gender, designation, aadhaar, resPhone, mobile, email;
        LocalDate dob, joinedService, joinedPost;
        Address comm, perm;
        List<Qualification> quals;
        List<Employment> employment;
        List<CourseOffered> courses;

        Map<String, Object> params(String college, String by) {
            Map<String, Object> p = new java.util.HashMap<>();
            p.put("college", college);
            p.put("dept", deptKey);
            p.put("title", title);
            p.put("name", name);
            p.put("relation", relation);
            p.put("gender", gender);
            p.put("dob", dob);
            p.put("designation", designation);
            p.put("joinedService", joinedService);
            p.put("joinedPost", joinedPost);
            p.put("aadhaar", aadhaar);
            p.put("comm", json.writeValueAsString(comm));
            p.put("perm", json.writeValueAsString(perm));
            p.put("resPhone", resPhone);
            p.put("mobile", mobile);
            p.put("email", email);
            p.put("quals", json.writeValueAsString(quals));
            p.put("employment", json.writeValueAsString(employment));
            p.put("courses", json.writeValueAsString(courses));
            p.put("by", by);
            return p;
        }
    }

    private Clean validate(FacultyInput in, Long id) {
        if (in == null) throw ApiException.badRequest("Faculty details are required");
        Clean c = new Clean();
        LocalDate today = LocalDate.now();
        c.title = trim(in.title());
        if (!TITLES.contains(c.title)) throw ApiException.badRequest("Title must be Dr., Mr. or Ms.");
        c.name = text(in.name(), "Name", 2, 120, true);
        c.relation = text(in.relationName(), "Father / husband name", 2, 120, false);
        c.deptKey = departments.key(in.dept());
        c.gender = trim(in.gender());
        if (!GENDERS.contains(c.gender)) throw ApiException.badRequest("Gender must be Male, Female or Other");
        c.dob = date(in.dob(), "Date of birth", true);
        int age = Period.between(c.dob, today).getYears();
        if (age < 21 || age > 80) throw ApiException.badRequest("Date of birth must give an age between 21 and 80");
        c.designation = text(in.designation(), "Present designation", 2, 80, true);
        c.joinedService = date(in.joinedServiceOn(), "Date of joining service", true);
        c.joinedPost = date(in.joinedPostOn(), "Date of joining present post", true);
        if (c.joinedService.isAfter(today) || c.joinedPost.isAfter(today)) {
            throw ApiException.badRequest("Joining dates cannot be in the future");
        }
        if (c.joinedService.isBefore(c.dob.plusYears(18))) {
            throw ApiException.badRequest("Date of joining service must be at least 18 years after the date of birth");
        }
        if (c.joinedPost.isBefore(c.joinedService)) {
            throw ApiException.badRequest("Date of joining present post cannot be before the date of joining service");
        }
        String aadhaar = trim(in.aadhaar()).replaceAll("[\\s-]", "");
        if (aadhaar.isEmpty()) {
            c.aadhaar = null;
        } else {
            if (!aadhaar.matches("[2-9][0-9]{11}") || !verhoeffValid(aadhaar)) {
                throw ApiException.badRequest("Aadhaar number is not valid (12 digits, checked with its check digit)");
            }
            Integer taken = db.sql("SELECT count(*) FROM faculty_master WHERE aadhaar = ? AND id <> ?")
                    .params(aadhaar, id == null ? -1 : id).query(Integer.class).single();
            if (taken > 0) throw ApiException.conflict("This Aadhaar number is already in the faculty master");
            c.aadhaar = aadhaar;
        }
        c.comm = address(in.commAddress(), "Address for communication");
        c.perm = address(in.permAddress(), "Permanent address");
        c.resPhone = phone(in.residentialPhone(), "Residential phone");
        String mobile = trim(in.mobile()).replaceAll("[\\s-]", "").replaceFirst("^(\\+91|0)", "");
        if (!mobile.matches("[6-9][0-9]{9}")) throw ApiException.badRequest("Mobile must be a 10-digit Indian number");
        c.mobile = mobile;
        String email = trim(in.email());
        if (!email.isEmpty() && (email.length() > 120 || !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"))) {
            throw ApiException.badRequest("E-mail is not valid");
        }
        c.email = email.isEmpty() ? null : email.toLowerCase();

        c.quals = new ArrayList<>();
        for (Qualification q : list(in.qualifications(), 10, "qualifications")) {
            String qual = text(q.qualification(), "Qualification", 2, 60, true);
            String disc = text(q.discipline(), "Discipline / specialisation", 2, 100, true);
            String done = trim(q.completedOn());
            YearMonth ym;
            try {
                ym = YearMonth.parse(done);
            } catch (DateTimeParseException e) {
                throw ApiException.badRequest("Choose the month and year of completion for " + qual);
            }
            if (ym.isAfter(YearMonth.from(today)) || ym.isBefore(YearMonth.from(c.dob))) {
                throw ApiException.badRequest("Month and year of completion of " + qual + " is not possible");
            }
            c.quals.add(new Qualification(qual, disc, ym.toString()));
        }

        c.employment = new ArrayList<>();
        for (Employment e : list(in.employment(), 30, "employment rows")) {
            String section = trim(e.section()).toUpperCase();
            if (!SECTIONS.contains(section)) throw ApiException.badRequest("Unknown employment section: " + section);
            String des = text(e.designation(), "Designation / position", 2, 80, true);
            String org = text(e.organisation(), "College or company", 2, 150, true);
            String loc = text(e.location(), "Location", 2, 100, true);
            LocalDate from = date(e.from(), "From date", true);
            LocalDate to = date(e.to(), "To date", false);
            if (from.isAfter(today)) throw ApiException.badRequest("From date cannot be in the future at " + org);
            if (to != null && to.isBefore(from)) throw ApiException.badRequest("To date is before from date at " + org);
            if (to != null && to.isAfter(today)) throw ApiException.badRequest("To date cannot be in the future at " + org);
            if (from.isBefore(c.dob.plusYears(18))) {
                throw ApiException.badRequest("Employment at " + org + " starts before the age of 18");
            }
            c.employment.add(new Employment(section, des, org, loc, from.toString(), to == null ? "" : to.toString()));
        }

        c.courses = new ArrayList<>();
        for (CourseOffered co : list(in.courses(), 100, "courses")) {
            String kind = trim(co.kind()).toUpperCase();
            if (!COURSE_KINDS.contains(kind)) throw ApiException.badRequest("Course type must be THEORY or PRACTICAL");
            String branch = text(co.branch(), "Branch", 2, 80, true);
            String course = text(co.course(), "Course", 2, 150, true);
            int times = co.timesOffered() == null ? 0 : co.timesOffered();
            if (times < 1 || times > 99) throw ApiException.badRequest("Number of times offered must be 1-99 for " + course);
            c.courses.add(new CourseOffered(kind, branch, course, times));
        }
        return c;
    }

    private Address address(Address a, String label) {
        if (a == null) a = new Address(null, null, null, null, null, null, null);
        String pin = trim(a.pincode());
        if (!pin.isEmpty() && !pin.matches("[1-9][0-9]{5}")) {
            throw ApiException.badRequest(label + ": pincode must be 6 digits");
        }
        return new Address(text(a.doorNo(), label + " door no.", 1, 30, false),
                text(a.street(), label + " street", 1, 120, false),
                text(a.city(), label + " village / city", 1, 80, false),
                text(a.country(), label + " country", 2, 60, false),
                text(a.state(), label + " state", 2, 60, false),
                text(a.district(), label + " district", 2, 60, false),
                pin.isEmpty() ? null : pin);
    }

    private static String phone(String v, String label) {
        String p = trim(v);
        if (p.isEmpty()) return null;
        if (!p.matches("\\+?[0-9 ()-]{6,20}")) throw ApiException.badRequest(label + " is not a valid phone number");
        return p;
    }

    private static <T> List<T> list(List<T> rows, int max, String label) {
        if (rows == null) return List.of();
        List<T> clean = rows.stream().filter(java.util.Objects::nonNull).toList();
        if (clean.size() > max) throw ApiException.badRequest("At most " + max + " " + label + " can be entered");
        return clean;
    }

    private static String text(String v, String label, int min, int max, boolean required) {
        String t = trim(v).replaceAll("\\s+", " ");
        if (t.isEmpty()) {
            if (required) throw ApiException.badRequest(label + " is required");
            return null;
        }
        if (t.length() < min || t.length() > max) {
            throw ApiException.badRequest(label + " must be " + min + "-" + max + " characters");
        }
        return t;
    }

    private static LocalDate date(String v, String label, boolean required) {
        String t = trim(v);
        if (t.isEmpty()) {
            if (required) throw ApiException.badRequest(label + " is required");
            return null;
        }
        try {
            return LocalDate.parse(t);
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest(label + " is not a valid date");
        }
    }

    private static String trim(String v) {
        return v == null ? "" : v.trim();
    }

    private static String imageKind(String kind) {
        String k = trim(kind).toLowerCase();
        if (!IMAGE_LIMITS.containsKey(k)) throw ApiException.badRequest("Image must be photo or signature");
        return k;
    }

    private static boolean startsWith(byte[] content, byte[] magic) {
        return content.length >= magic.length && Arrays.equals(Arrays.copyOf(content, magic.length), magic);
    }

    private void requireExists(long id, String college) {
        if (db.sql("SELECT count(*) FROM faculty_master WHERE id = ? AND college_key = ?").params(id, college)
                .query(Integer.class).single() == 0) {
            throw ApiException.notFound("Faculty record not found");
        }
    }

    // ---------------------------------------------------------------- reading

    private FacultyDetail detail(ResultSet rs, boolean maskAadhaar) throws SQLException {
        List<Employment> employment = employmentRows(rs.getString("employment"));
        String aadhaar = rs.getString("aadhaar");
        if (aadhaar != null && maskAadhaar) aadhaar = "XXXX XXXX " + aadhaar.substring(8);
        return new FacultyDetail(rs.getLong("id"), rs.getString("title"), rs.getString("name"),
                rs.getString("relation_name"), rs.getString("dept_key"), rs.getString("dept_name"),
                rs.getString("gender"), rs.getObject("dob", LocalDate.class).toString(), rs.getString("designation"),
                rs.getObject("joined_service_on", LocalDate.class).toString(),
                rs.getObject("joined_post_on", LocalDate.class).toString(), aadhaar,
                json.readValue(rs.getString("comm_address"), Address.class),
                json.readValue(rs.getString("perm_address"), Address.class),
                rs.getString("residential_phone"), rs.getString("mobile"), rs.getString("email"),
                json.readValue(rs.getString("qualifications"), new TypeReference<List<Qualification>>() { }),
                employment,
                json.readValue(rs.getString("courses"), new TypeReference<List<CourseOffered>>() { }),
                experience(employment, rs.getObject("joined_service_on", LocalDate.class), LocalDate.now()),
                rs.getBoolean("has_photo"), rs.getBoolean("has_signature"),
                rs.getString("created_by"), rs.getString("updated_by"),
                Semesters.display(rs.getObject("updated_at", OffsetDateTime.class)));
    }

    private List<Employment> employmentRows(String raw) {
        return json.readValue(raw, new TypeReference<List<Employment>>() { });
    }

    /**
     * Years and months per section; each row counts from its from date to its to date (today when left blank), both
     * inclusive. THIS_COLLEGE runs from joining service to today; TOTAL is every period together, overlaps counted once.
     */
    static List<Experience> experience(List<Employment> rows, LocalDate joinedService, LocalDate today) {
        List<Experience> out = new ArrayList<>();
        for (String section : SECTIONS) {
            int months = 0;
            for (Employment e : rows) {
                if (section.equals(e.section())) months += months(LocalDate.parse(e.from()), endOf(e, today));
            }
            out.add(experience(section, months));
        }
        out.add(experience("THIS_COLLEGE", months(joinedService, today)));
        out.add(experience("TOTAL", overallMonths(rows, joinedService, today)));
        return out;
    }

    /** All employment periods plus service here (joining to today), merged so an overlap is counted once. */
    static int overallMonths(List<Employment> rows, LocalDate joinedService, LocalDate today) {
        List<LocalDate[]> spans = new ArrayList<>();
        for (Employment e : rows) spans.add(new LocalDate[] {LocalDate.parse(e.from()), endOf(e, today)});
        if (joinedService != null && !joinedService.isAfter(today)) spans.add(new LocalDate[] {joinedService, today});
        spans.sort((a, b) -> a[0].compareTo(b[0]));
        int months = 0;
        LocalDate start = null, end = null;
        for (LocalDate[] s : spans) {
            if (start != null && !s[0].isAfter(end.plusDays(1))) {
                if (s[1].isAfter(end)) end = s[1];
                continue;
            }
            if (start != null) months += months(start, end);
            start = s[0];
            end = s[1];
        }
        if (start != null) months += months(start, end);
        return months;
    }

    private static LocalDate endOf(Employment e, LocalDate today) {
        return e.to() == null || e.to().isBlank() ? today : LocalDate.parse(e.to());
    }

    /** Whole months from one date to another, both inclusive. */
    private static int months(LocalDate from, LocalDate to) {
        if (from == null || to.isBefore(from)) return 0;
        Period p = Period.between(from, to.plusDays(1));
        return p.getYears() * 12 + p.getMonths();
    }

    private static Experience experience(String section, int months) {
        return new Experience(section, months / 12, months % 12);
    }

    /** Verhoeff check digit, as used by Aadhaar numbers. */
    static boolean verhoeffValid(String digits) {
        int[][] d = {{0, 1, 2, 3, 4, 5, 6, 7, 8, 9}, {1, 2, 3, 4, 0, 6, 7, 8, 9, 5}, {2, 3, 4, 0, 1, 7, 8, 9, 5, 6},
                {3, 4, 0, 1, 2, 8, 9, 5, 6, 7}, {4, 0, 1, 2, 3, 9, 5, 6, 7, 8}, {5, 9, 8, 7, 6, 0, 4, 3, 2, 1},
                {6, 5, 9, 8, 7, 1, 0, 4, 3, 2}, {7, 6, 5, 9, 8, 2, 1, 0, 4, 3}, {8, 7, 6, 5, 9, 3, 2, 1, 0, 4},
                {9, 8, 7, 6, 5, 4, 3, 2, 1, 0}};
        int[][] p = {{0, 1, 2, 3, 4, 5, 6, 7, 8, 9}, {1, 5, 7, 6, 2, 8, 3, 0, 9, 4}, {5, 8, 0, 3, 7, 9, 6, 1, 4, 2},
                {8, 9, 1, 6, 0, 4, 3, 5, 2, 7}, {9, 4, 5, 3, 1, 2, 6, 8, 7, 0}, {4, 2, 8, 6, 5, 7, 3, 9, 0, 1},
                {2, 7, 9, 3, 8, 0, 6, 4, 1, 5}, {7, 0, 4, 6, 9, 1, 3, 2, 5, 8}};
        int c = 0;
        for (int i = 0; i < digits.length(); i++) {
            c = d[c][p[i % 8][digits.charAt(digits.length() - 1 - i) - '0']];
        }
        return c == 0;
    }
}
