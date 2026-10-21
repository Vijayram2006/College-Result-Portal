package edu.kvell.results.questionpapers;

import edu.kvell.results.auth.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Question papers for faculty, HODs, the Associate Dean, the college COE and the Chief COE (see the service). */
@RestController
@RequestMapping("/api/question-papers")
public class QuestionPaperController {

    private final QuestionPaperService papers;

    public QuestionPaperController(QuestionPaperService papers) {
        this.papers = papers;
    }

    @GetMapping
    List<Map<String, Object>> list() {
        return papers.list(CurrentUser.get());
    }

    @GetMapping("/{id}")
    Map<String, Object> get(@PathVariable long id) {
        return papers.get(id, CurrentUser.get());
    }

    @PostMapping
    Map<String, Object> create(@RequestBody QuestionPaperService.PaperInput input, HttpServletRequest http) {
        return papers.create(input, CurrentUser.get(), http.getRemoteAddr());
    }

    @PutMapping("/{id}")
    Map<String, Object> resubmit(@PathVariable long id, @RequestBody QuestionPaperService.PaperInput input,
                                 HttpServletRequest http) {
        return papers.resubmit(id, input, CurrentUser.get(), http.getRemoteAddr());
    }

    @PostMapping("/{id}/action")
    Map<String, Object> act(@PathVariable long id, @RequestBody QuestionPaperService.ActionRequest request,
                            HttpServletRequest http) {
        return papers.act(id, request, CurrentUser.get(), http.getRemoteAddr());
    }

    @GetMapping("/{id}/pdf")
    ResponseEntity<byte[]> pdf(@PathVariable long id, HttpServletRequest http) {
        QuestionPaperService.Pdf pdf = papers.pdf(id, CurrentUser.get(), http.getRemoteAddr());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(pdf.fileName() == null ? "question-paper.pdf" : pdf.fileName())
                                .build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(pdf.bytes());
    }
}
