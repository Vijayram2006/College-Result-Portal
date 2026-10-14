package edu.kvell.results.publicinfo;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Liveness for hosting platforms (Render checks "/" or a configured path): answers without touching the database. */
@RestController
public class HealthController {

    @GetMapping({"/", "/healthz"})
    Map<String, String> health() {
        return Map.of("status", "ok", "service", "kvell-result-portal-backend");
    }
}
