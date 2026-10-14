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
 * The Super Admin is never blocked, so the locks can always be lifted.
 */
public class GovernanceFilter extends OncePerRequestFilter {

    private static final Set<String> READS = Set.of("GET", "HEAD", "OPTIONS");

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
            String blocked = switch (user.role()) {
                case STUDENT -> path.startsWith("/api/student/") && governance.studentPortalClosed()
                        ? "The student result portal is closed by the Controller of Examinations." : null;
                case FACULTY -> write && path.startsWith("/api/faculty/")
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
