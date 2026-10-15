package edu.kvell.results.governance;

import edu.kvell.results.auth.CurrentUser;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Applies the Super Admin's gateways and locks to every request, after sign-in is resolved:
 * <ul>
 *   <li>students: nothing while the student portal is closed (403, portalClosed);</li>
 *   <li>faculty: no saving or forwarding marks while mark entry is closed, past its deadline or the college is
 *       locked (423);</li>
 *   <li>a college's COE: no changes while the college is locked / frozen or the university is in emergency
 *       lockdown (423). Reading is always allowed.</li>
 * </ul>
 * The Super Admin is never locked out, so the locks can always be lifted; it only views (never changes) a college's
 * student data, marks, departments and subjects, which stay with that college's COE (403, viewOnly).
 */
public class GovernanceFilter extends OncePerRequestFilter {

    private static final Set<String> READS = Set.of("GET", "HEAD", "OPTIONS");
    private static final java.util.List<String> SUPER_ADMIN_VIEW_ONLY = java.util.List.of(
            "/api/admin/students", "/api/admin/marks", "/api/admin/forward", "/api/admin/departments",
            "/api/admin/subjects", "/api/admin/faculty-master", "/api/admin/internal-scheme",
            "/api/admin/internal-marks");
    static final String VIEW_ONLY_MESSAGE =
            "The Chief COE has view-only access to student data, marks, departments, subjects, the faculty master and internal marks. "
                    + "The college's Controller of Examinations makes these changes.";

    private final GovernanceService governance;

    public GovernanceFilter(GovernanceService governance) {
        this.governance = governance;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CurrentUser user) {
            String path = request.getRequestURI();
            boolean write = !READS.contains(request.getMethod());
            if (write && user.role() == CurrentUser.Role.SUPER_ADMIN
                    && SUPER_ADMIN_VIEW_ONLY.stream().anyMatch(p -> path.equals(p) || path.startsWith(p + "/"))) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write("{\"error\":" + quote(VIEW_ONLY_MESSAGE) + ",\"message\":"
                        + quote(VIEW_ONLY_MESSAGE) + ",\"viewOnly\":true}");
                return;
            }
            String blocked = switch (user.role()) {
                case STUDENT -> path.startsWith("/api/student/") && governance.studentPortalClosed()
                        ? "The student result portal is closed by the Controller of Examinations." : null;
                case FACULTY -> write && path.startsWith("/api/faculty/")
                        ? governance.facultyLockReason(user.collegeKey()) : null;
                // HOD corrections of internal marks follow the same mark-entry locks and deadline as faculty
                case HOD -> write && path.startsWith("/api/hod/internal-marks")
                        ? governance.facultyLockReason(user.collegeKey()) : null;
                case ADMIN -> write && path.startsWith("/api/admin/")
                        ? governance.coeLockReason(user.collegeKey()) : null;
                default -> null;
            };
            if (blocked != null) {
                boolean student = user.role() == CurrentUser.Role.STUDENT;
                response.setStatus(student ? HttpServletResponse.SC_FORBIDDEN : 423);
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");
                response.getWriter().write("{\"error\":" + quote(blocked) + ",\"message\":" + quote(blocked)
                        + (student ? ",\"portalClosed\":true" : ",\"locked\":true") + "}");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private static String quote(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            if (c == '"' || c == '\\') b.append('\\').append(c);
            else if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
            else b.append(c);
        }
        return b.append('"').toString();
    }
}
