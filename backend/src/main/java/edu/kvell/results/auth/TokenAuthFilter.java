package edu.kvell.results.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
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
                        && !ALLOWED_BEFORE_PASSWORD_CHANGE.contains(request.getRequestURI())) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Choose a new password before continuing\","
                            + "\"passwordChangeRequired\":true}");
                    return;
                }
                var authentication = new UsernamePasswordAuthenticationToken(user.get(), null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.get().role().name())));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        chain.doFilter(request, response);
    }

    static String bearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return null;
        String token = header.substring(7).trim();
        return token.isEmpty() || token.length() > 200 ? null : token;
    }
}
