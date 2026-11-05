package edu.kvell.results.coursematerials;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.Departments;
import edu.kvell.results.erp.ErpSupport;
import edu.kvell.results.notifications.NotificationService;
import edu.kvell.results.notifications.NotificationService.Audience;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Course materials. The subject faculty (or the HOD) publish notes, slides, lab manuals, question banks and references
 * unit by unit, optionally for several departments that share the subject. Students see the materials of their own
 * class; the HOD sees the department's coverage (materials per unit); the Associate Dean the college's.
 */
@RestController
@RequestMapping("/api/coursematerials")
public class CourseMaterialController {

    static final Set<String> TYPES = Set.of("NOTE", "SLIDES", "LAB_MANUAL", "QUESTION_BANK", "REFERENCE");
    static final int MAX_BYTES = 15 * 1024 * 1024;

    public record Material(long id, long subjectId, String subjectCode, String subjectTitle, long facultyId, String facultyName,
                           String deptKey, int semester, String section, int unitNumber, String materialType, String title,
                           String description, String fileUrl, String fileName, int fileSizeKb, boolean isPublished,
                           int downloadCount, String createdAt) {
    }

    public record UploadRequest(Long subjectId, Integer unitNumber, String materialType, String title, String description,
                                String fileUrl, String fileName, Integer fileSizeKb, String section, List<String> deptKeys,
                                Integer semester) {
    }

    public record UnitCoverage(int unitNumber, int notesCount, int slidesCount, int labCount, int qbCount, int totalCount) {
    }

    public record SubjectCoverage(long subjectId, String subjectCode, String subjectTitle, String faculty, int semester,
                                  int totalMaterials, int totalDownloads, List<UnitCoverage> units) {
    }

    private final JdbcClient db;
    private final Departments departments;
    private final NotificationService notifications;

    public CourseMaterialController(JdbcClient db, Departments departments, NotificationService notifications) {
        this.db = db;
        this.departments = departments;
        this.notifications = notifications;
    }

    @GetMapping
    List<Material> list(@RequestParam(required = false) String deptKey, @RequestParam(required = false) Integer semester,
                        @RequestParam(required = false) String section, @RequestParam(required = false) Long subjectId,
                        @RequestParam(required = false) Integer unitNumber, @RequestParam(required = false) String materialType) {
        CurrentUser me = CurrentUser.get();
        List<Object> p = new ArrayList<>();
        String where = scope(me, deptKey, p);
        if (semester != null && me.role() != Role.STUDENT) {
            where += " AND m.semester = ?";
            p.add(semester);
        }
        if (section != null && !section.isBlank() && !"ALL".equalsIgnoreCase(section)) {
            where += " AND (m.section = 'ALL' OR m.section = ?)";
            p.add(section);
        }
        if (subjectId != null) {
            where += " AND j.id = ?";
            p.add(subjectId);
        }
        if (unitNumber != null) {
            where += " AND m.unit_number = ?";
            p.add(unitNumber);
        }
        if (materialType != null && !materialType.isBlank() && !"ALL".equalsIgnoreCase(materialType)) {
            where += " AND m.material_type = ?";
            p.add(materialType.toUpperCase(Locale.ROOT));
        }
        return materials(where, p.toArray());
    }

    @PostMapping
    @Transactional
    Material upload(@RequestBody UploadRequest req) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        if (req == null || req.subjectId() == null || req.title() == null || req.title().isBlank()) {
            throw ApiException.badRequest("Choose the subject and give the material a title");
        }
        Map<String, Object> subject = db.sql("SELECT dept_key, semester, code, title FROM subjects WHERE id = ?").param(req.subjectId())
                .query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("Subject not found"));
        String dept = (String) subject.get("dept_key");
        int sem = ((Number) subject.get("semester")).intValue();
        String code = (String) subject.get("code");
        requireTeacher(me, dept, sem, code);
        int unit = req.unitNumber() == null ? 1 : req.unitNumber();
        if (unit < 1 || unit > 10) throw ApiException.badRequest("The unit must be 1 to 10");
        String type = req.materialType() == null || req.materialType().isBlank() ? "NOTE" : req.materialType().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(type)) throw ApiException.badRequest("Unknown material type: " + req.materialType());
        String section = req.section() == null || req.section().isBlank() ? "ALL" : clip(req.section().trim().toUpperCase(Locale.ROOT), 5);

        Long fileId = null;
        String link = null;
        String fileName = req.fileName() == null ? "" : clip(req.fileName().trim(), 200);
        int sizeKb = 0;
        String url = req.fileUrl() == null ? "" : req.fileUrl().trim();
        if (url.startsWith("data:")) {
            int comma = url.indexOf(',');
            if (comma < 0 || !url.substring(0, comma).endsWith(";base64")) throw ApiException.badRequest("The file could not be read");
            String contentType = url.substring(5, comma - 7);
            byte[] data;
            try {
                data = Base64.getDecoder().decode(url.substring(comma + 1));
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("The file could not be read");
            }
            if (data.length == 0) throw ApiException.badRequest("The file is empty");
            if (data.length > MAX_BYTES) throw ApiException.badRequest("The file is larger than 15 MB");
            fileId = db.sql("INSERT INTO course_material_files (file_name, content_type, data) VALUES (?, ?, ?) RETURNING id")
                    .params(fileName.isEmpty() ? "material" : fileName, contentType.isEmpty() ? "application/octet-stream" : clip(contentType, 100), data)
                    .query(Long.class).single();
            sizeKb = Math.max(1, data.length / 1024);
        } else if (url.startsWith("https://") || url.startsWith("http://")) {
            link = clip(url, 500);
        } else {
            throw ApiException.badRequest("Attach a file or give a link");
        }

        // The departments that share it: the subject's own, plus others that have the same subject in the same semester
        Set<String> depts = new LinkedHashSet<>();
        depts.add(dept);
        if (req.deptKeys() != null) {
            for (String d : req.deptKeys()) {
                if (d == null || d.isBlank()) continue;
                String k = departments.key(d);
                int has = db.sql("SELECT count(*) FROM subjects WHERE dept_key = ? AND semester = ? AND code = ?").params(k, sem, code)
                        .query(Integer.class).single();
                if (has > 0) depts.add(k);
            }
        }
        long first = 0;
        for (String d : depts) {
            long id = db.sql("""
                            INSERT INTO course_materials (dept_key, semester, subject_code, section, unit_number, material_type, title,
                                                          description, file_id, link_url, file_name, file_size_kb, faculty_user_id, faculty_name)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                            """)
                    .params(d, sem, code, section, unit, type, clip(req.title().trim(), 200),
                            req.description() == null ? "" : clip(req.description().trim(), 1000), fileId, link, fileName,
                            sizeKb, me.id(), me.name())
                    .query(Long.class).single();
            if (first == 0) first = id;
            notifications.notify(Audience.STUDENT, d, sem, "New course material",
                    me.name() + " published \"" + clip(req.title().trim(), 80) + "\" (" + code + ", Unit " + unit + "). Open Course Materials.",
                    "materials");
        }
        return materials("m.id = ?", new Object[]{first}).get(0);
    }

    @PostMapping("/{id}/download")
    void recordDownload(@PathVariable long id) {
        CurrentUser.get();
        db.sql("UPDATE course_materials SET download_count = download_count + 1 WHERE id = ?").param(id).update();
    }

    /** The stored file of a material, for the people who can see the material. */
    @GetMapping("/{id}/file")
    ResponseEntity<byte[]> file(@PathVariable long id) {
        CurrentUser me = CurrentUser.get();
        List<Object> p = new ArrayList<>();
        String where = scope(me, null, p) + " AND m.id = ?";
        p.add(id);
        if (materials(where, p.toArray()).isEmpty()) throw ApiException.notFound("Material not found");
        Map<String, Object> f = db.sql("""
                        SELECT f.file_name, f.content_type, f.data FROM course_materials m JOIN course_material_files f ON f.id = m.file_id
                        WHERE m.id = ?
                        """).param(id).query().listOfRows().stream().findFirst()
                .orElseThrow(() -> ApiException.notFound("This material has no stored file"));
        MediaType type;
        try {
            type = MediaType.parseMediaType((String) f.get("content_type"));
        } catch (Exception e) {
            type = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok().contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename((String) f.get("file_name"), StandardCharsets.UTF_8).build().toString())
                .body((byte[]) f.get("data"));
    }

    @DeleteMapping("/{id}")
    @Transactional
    void delete(@PathVariable long id) {
        CurrentUser me = ErpSupport.require(Role.FACULTY, Role.HOD);
        Map<String, Object> m = db.sql("SELECT dept_key, faculty_user_id, file_id FROM course_materials WHERE id = ?").param(id)
                .query().listOfRows().stream().findFirst().orElseThrow(() -> ApiException.notFound("Material not found"));
        boolean own = m.get("faculty_user_id") != null && ((Number) m.get("faculty_user_id")).longValue() == me.id();
        boolean hod = me.role() == Role.HOD && me.deptKey().equals(m.get("dept_key"));
        if (!own && !hod) throw new ApiException(HttpStatus.FORBIDDEN, "Only the faculty who published it or the HOD can delete it");
        db.sql("DELETE FROM course_materials WHERE id = ?").param(id).update();
        Object fileId = m.get("file_id");
        if (fileId != null) {
            db.sql("DELETE FROM course_material_files f WHERE f.id = ? AND NOT EXISTS (SELECT 1 FROM course_materials WHERE file_id = f.id)")
                    .param(fileId).update();
        }
    }

    /** Materials per unit of each subject in reach (the subject list also feeds the upload form). */
    @GetMapping("/coverage")
    List<SubjectCoverage> coverage(@RequestParam(required = false) String deptKey, @RequestParam(required = false) Integer semester) {
        CurrentUser me = CurrentUser.get();
        String where;
        List<Object> p = new ArrayList<>();
        switch (me.role()) {
            case STUDENT -> {
                where = "j.dept_key = ? AND j.semester = (SELECT semester FROM students WHERE reg_no = ?)";
                p.add(me.deptKey());
                p.add(me.regNo());
            }
            case FACULTY -> {
                where = "EXISTS (SELECT 1 FROM faculty_subjects f WHERE f.user_id = ? AND f.dept_key = j.dept_key AND f.semester = j.semester AND f.subject_code = j.code)";
                p.add(me.id());
            }
            case HOD -> {
                where = "j.dept_key = ?";
                p.add(me.deptKey());
            }
            case DEAN -> {
                where = departments.inCollege("j.dept_key");
                if (deptKey != null && !deptKey.isBlank() && !"ALL".equalsIgnoreCase(deptKey)) {
                    where += " AND j.dept_key = ?";
                    p.add(departments.key(deptKey));
                }
            }
            default -> throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this");
        }
        if (semester != null && me.role() != Role.STUDENT) {
            where += " AND j.semester = ?";
            p.add(semester);
        }
        List<Map<String, Object>> subjects = db.sql("""
                        SELECT j.id, j.code, j.title, j.semester, j.dept_key,
                               coalesce((SELECT string_agg(DISTINCT u.display_name, ', ') FROM faculty_subjects f JOIN users u ON u.id = f.user_id
                                         WHERE f.dept_key = j.dept_key AND f.semester = j.semester AND f.subject_code = j.code), j.faculty) AS faculty
                        FROM subjects j WHERE""" + " " + where + " ORDER BY j.semester, j.code")
                .params(p.toArray()).query().listOfRows();
        List<SubjectCoverage> out = new ArrayList<>();
        for (Map<String, Object> s : subjects) {
            String dept = (String) s.get("dept_key");
            int sem = ((Number) s.get("semester")).intValue();
            String code = (String) s.get("code");
            List<UnitCoverage> units = db.sql("""
                            SELECT u, count(m.id) FILTER (WHERE m.material_type = 'NOTE'), count(m.id) FILTER (WHERE m.material_type = 'SLIDES'),
                                   count(m.id) FILTER (WHERE m.material_type = 'LAB_MANUAL'), count(m.id) FILTER (WHERE m.material_type = 'QUESTION_BANK'),
                                   count(m.id)
                            FROM generate_series(1, 5) u
                            LEFT JOIN course_materials m ON m.unit_number = u AND m.dept_key = ? AND m.semester = ? AND m.subject_code = ? AND m.is_published
                            GROUP BY u ORDER BY u
                            """).params(dept, sem, code)
                    .query((rs, n) -> new UnitCoverage(rs.getInt(1), rs.getInt(2), rs.getInt(3), rs.getInt(4), rs.getInt(5), rs.getInt(6)))
                    .list();
            int[] totals = db.sql("SELECT count(*), coalesce(sum(download_count), 0) FROM course_materials WHERE dept_key = ? AND semester = ? AND subject_code = ?")
                    .params(dept, sem, code).query((rs, n) -> new int[]{rs.getInt(1), rs.getInt(2)}).single();
            out.add(new SubjectCoverage(((Number) s.get("id")).longValue(), code, (String) s.get("title"), (String) s.get("faculty"), sem,
                    totals[0], totals[1], units));
        }
        return out;
    }

    // ---------------------------------------------------------------- rules

    /** What the signed-in user may see: a student their class, faculty their subjects and uploads, the HOD the department. */
    private String scope(CurrentUser me, String deptKey, List<Object> p) {
        switch (me.role()) {
            case STUDENT -> {
                p.add(me.regNo());
                return "m.is_published AND (m.dept_key, m.semester) = (SELECT dept_key, semester FROM students WHERE reg_no = ?)";
            }
            case FACULTY -> {
                p.add(me.id());
                p.add(me.id());
                return "(m.faculty_user_id = ? OR EXISTS (SELECT 1 FROM faculty_subjects f WHERE f.user_id = ? AND f.dept_key = m.dept_key"
                        + " AND f.semester = m.semester AND f.subject_code = m.subject_code))";
            }
            case HOD -> {
                p.add(me.deptKey());
                return "m.dept_key = ?";
            }
            case DEAN -> {
                String w = departments.inCollege("m.dept_key");
                if (deptKey != null && !deptKey.isBlank() && !"ALL".equalsIgnoreCase(deptKey)) {
                    w += " AND m.dept_key = ?";
                    p.add(departments.key(deptKey));
                }
                return w;
            }
            default -> throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this");
        }
    }

    private List<Material> materials(String where, Object[] params) {
        return db.sql("""
                        SELECT m.id, coalesce(j.id, 0), m.subject_code, coalesce(j.title, m.subject_code), coalesce(m.faculty_user_id, 0),
                               m.faculty_name, m.dept_key, m.semester, m.section, m.unit_number, m.material_type, m.title, m.description,
                               m.file_id, m.link_url, m.file_name, m.file_size_kb, m.is_published, m.download_count, m.created_at
                        FROM course_materials m
                        LEFT JOIN subjects j ON j.dept_key = m.dept_key AND j.semester = m.semester AND j.code = m.subject_code
                        WHERE""" + " " + where + " ORDER BY m.created_at DESC, m.id DESC")
                .params(params)
                .query((rs, n) -> {
                    long id = rs.getLong(1);
                    String url = rs.getObject(14) != null ? "/coursematerials/" + id + "/file" : rs.getString(15) == null ? "" : rs.getString(15);
                    OffsetDateTime created = rs.getObject(20, OffsetDateTime.class);
                    return new Material(id, rs.getLong(2), rs.getString(3), rs.getString(4), rs.getLong(5), rs.getString(6),
                            rs.getString(7), rs.getInt(8), rs.getString(9), rs.getInt(10), rs.getString(11), rs.getString(12),
                            rs.getString(13), url, rs.getString(16), rs.getInt(17), rs.getBoolean(18), rs.getInt(19),
                            created == null ? null : created.toString());
                }).list();
    }

    private void requireTeacher(CurrentUser me, String dept, int sem, String code) {
        if (me.role() == Role.HOD && dept.equals(me.deptKey())) return;
        int n = db.sql("SELECT count(*) FROM faculty_subjects WHERE user_id = ? AND dept_key = ? AND semester = ? AND subject_code = ?")
                .params(me.id(), dept, sem, code).query(Integer.class).single();
        if (n == 0) throw new ApiException(HttpStatus.FORBIDDEN, "You are not allotted to teach " + code);
    }

    private static String clip(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }
}
