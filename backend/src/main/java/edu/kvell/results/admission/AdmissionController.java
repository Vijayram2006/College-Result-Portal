package edu.kvell.results.admission;

import edu.kvell.results.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The admission cell's applicants and their documents (see AdmissionService). */
@RestController
@RequestMapping("/api/admission/applicants")
public class AdmissionController {

    private final AdmissionService admissions;

    public AdmissionController(AdmissionService admissions) {
        this.admissions = admissions;
    }

    @GetMapping
    List<Map<String, Object>> list(@RequestParam(required = false) String college) {
        return admissions.list(college, CurrentUser.get());
    }

    @GetMapping("/{id}")
    Map<String, Object> get(@PathVariable long id) {
        return admissions.get(id, CurrentUser.get());
    }

    @PostMapping
    Map<String, Object> create(@RequestBody Map<String, Object> body, @RequestParam(required = false) String college,
                               HttpServletRequest http) {
        return admissions.create(body, college, CurrentUser.get(), http.getRemoteAddr());
    }

    @PutMapping("/{id}")
    Map<String, Object> update(@PathVariable long id, @RequestBody Map<String, Object> body, HttpServletRequest http) {
        return admissions.update(id, body, CurrentUser.get(), http.getRemoteAddr());
    }

    @DeleteMapping("/{id}")
    Map<String, Object> delete(@PathVariable long id, HttpServletRequest http) {
        admissions.delete(id, CurrentUser.get(), http.getRemoteAddr());
        return Map.of("deleted", true);
    }

    @PutMapping("/{id}/documents/{kind}")
    Map<String, Object> putDocument(@PathVariable long id, @PathVariable String kind, @RequestBody Map<String, String> body,
                                    HttpServletRequest http) {
        return admissions.putDocument(id, kind, body, CurrentUser.get(), http.getRemoteAddr());
    }

    @GetMapping("/{id}/documents/{kind}")
    ResponseEntity<byte[]> document(@PathVariable long id, @PathVariable String kind, HttpServletRequest http) {
        AdmissionService.Document doc = admissions.document(id, kind, CurrentUser.get(), http.getRemoteAddr());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.fileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(doc.fileName()).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(doc.bytes());
    }
}
