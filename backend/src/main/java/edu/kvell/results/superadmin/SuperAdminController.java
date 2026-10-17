package edu.kvell.results.superadmin;

import edu.kvell.results.auth.CurrentUser;
import edu.kvell.results.governance.GovernanceService;
import edu.kvell.results.governance.SystemConfig;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.JsonNode;

/** Super Admin console (SecurityConfig limits /api/super-admin/** to the SUPER_ADMIN role). */
@RestController
@RequestMapping("/api/super-admin")
public class SuperAdminController {

    private final GovernanceService governance;
    private final SuperAdminService service;

    public SuperAdminController(GovernanceService governance, SuperAdminService service) {
        this.governance = governance;
        this.service = service;
    }

    @GetMapping("/config")
    SystemConfig config() {
        return governance.current();
    }

    /** A partial configuration (any of its sections); the rest is kept. */
    @PutMapping("/config")
    SystemConfig updateConfig(@RequestBody JsonNode patch, HttpServletRequest http) {
        return governance.update(patch, CurrentUser.get(), http.getRemoteAddr());
    }

    @PostMapping("/config/reset")
    SystemConfig resetConfig(HttpServletRequest http) {
        return governance.reset(CurrentUser.get(), http.getRemoteAddr());
    }

    @GetMapping("/officers")
    List<SuperAdminService.Officer> officers() {
        return service.officers();
    }

    @PostMapping("/officers")
    SuperAdminService.Officer createOfficer(@RequestBody SuperAdminService.CreateOfficer request,
                                           HttpServletRequest http) {
        return service.create(request, CurrentUser.get(), http.getRemoteAddr());
    }

    @PostMapping("/officers/{id}/status")
    SuperAdminService.Officer setStatus(@PathVariable long id, @RequestBody SuperAdminService.StatusChange request,
                                       HttpServletRequest http) {
        return service.setStatus(id, request, CurrentUser.get(), http.getRemoteAddr());
    }

    @PostMapping("/officers/{id}/reset-mfa")
    SuperAdminService.Officer resetMfa(@PathVariable long id, HttpServletRequest http) {
        return service.resetMfa(id, CurrentUser.get(), http.getRemoteAddr());
    }

    @PostMapping("/officers/{id}/reset-password")
    SuperAdminService.Officer resetPassword(@PathVariable long id,
                                           @RequestBody SuperAdminService.PasswordReset request,
                                           HttpServletRequest http) {
        return service.resetPassword(id, request, CurrentUser.get(), http.getRemoteAddr());
    }

    @GetMapping("/overview")
    List<SuperAdminService.CollegeOverview> overview() {
        return service.overview();
    }

    @GetMapping("/audit")
    List<SuperAdminService.AuditEntry> audit(@RequestParam(defaultValue = "500") int limit) {
        return service.auditTrail(limit);
    }

    @GetMapping("/storage")
    SuperAdminService.StorageStats storage() {
        return service.storage();
    }

    /** A backup of the configuration with row counts (no student data), for the storage tab's export button. */
    @GetMapping("/export")
    Map<String, Object> export() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("exportedAt", OffsetDateTime.now(GovernanceService.ZONE).toString());
        out.put("systemConfig", governance.current());
        out.put("storage", service.storage());
        return out;
    }
}
