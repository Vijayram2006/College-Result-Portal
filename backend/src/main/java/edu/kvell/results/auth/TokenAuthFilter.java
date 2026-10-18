package edu.kvell.results.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import edu.kvell.results.common.Departments;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Turns an "Authorization: Bearer <token>" header into an authenticated user. An account that still has its
 * starting password may only change it, read its profile or sign out until it does.
 */
public class TokenAuthFilter extends OncePerRequestFilter {

    private static final Set<String> ALLOWED_BEFORE_PASSWORD_CHANGE =
            Set.of("/api/auth/change-password", "/api/auth/me", "/api/auth/logout");
    private static final Set<String> ALLOWED_BEFORE_MFA_SETUP =
            Set.of("/api/auth/mfa/setup", "/api/auth/mfa/enable", "/api/auth/me", "/api/auth/logout");

    private final AuthService auth;

    public TokenAuthFilter(AuthService auth) {
        this.auth = auth;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String token = bearerToken(request);
        // Signing in never acts as the account of an old token the browser may still send
        if (token != null && !"/api/auth/login".equals(request.getRequestURI())) {
            Optional<CurrentUser> user = auth.authenticate(token);
            if (user.isPresent()) {
                if (user.get().mustChangePassword() && !"OPTIONS".equals(request.getMethod())
                        && !ALLOWED_BEFORE_PASSWORD_CHANGE.contains(request.getRequestURI())
                        && !request.getRequestURI().startsWith("/api/public/")) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Choose a new password before continuing\","
                            + "\"passwordChangeRequired\":true}");
                    return;
                }
                if (!user.get().mustChangePassword() && user.get().mfaSetupRequired()
                        && !"OPTIONS".equals(request.getMethod())
                        && !ALLOWED_BEFORE_MFA_SETUP.contains(request.getRequestURI())
                        && !request.getRequestURI().startsWith("/api/public/")) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Set up two-step sign-in before continuing\","
                            + "\"mfaSetupRequired\":true}");
                    return;
                }
                CurrentUser current = user.get();
                List<SimpleGrantedAuthority> roles = List.of(new SimpleGrantedAuthority("ROLE_" + current.role().name()));
                if (current.role() == CurrentUser.Role.SUPER_ADMIN) {
                    // The Super Admin works in the college it is inspecting, with every COE right there
                    current = new CurrentUser(current.id(), current.username(), current.name(), current.role(),
                            null, null, inspectedCollege(request, current.collegeKey()), current.mustChangePassword(),
                            current.mfaSetupRequired());
                    roles = List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"), new SimpleGrantedAuthority("ROLE_ADMIN"));
                }
                var authentication = new UsernamePasswordAuthenticationToken(current, null, roles);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        chain.doFilter(request, response);
    }

    /** The college named in X-College-View when it is a real one, else the account's own (Engineering by default). */
    static String inspectedCollege(HttpServletRequest request, String own) {
        String asked = request.getHeader("X-College-View");
        if (asked != null && Departments.COLLEGES.contains(asked.trim().toLowerCase(Locale.ROOT))) {
            return asked.trim().toLowerCase(Locale.ROOT);
        }
        return own != null && Departments.COLLEGES.contains(own) ? own : "engineering";
    }

    static String bearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return null;
        String token = header.substring(7).trim();
        return token.isEmpty() || token.length() > 200 ? null : token;
    }
}
