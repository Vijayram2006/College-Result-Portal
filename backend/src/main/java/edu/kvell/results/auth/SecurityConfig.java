package edu.kvell.results.auth;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import edu.kvell.results.governance.GovernanceFilter;
import edu.kvell.results.governance.GovernanceService;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http, AuthService auth, GovernanceService governance) throws Exception {
        http
                // Tokens travel in the Authorization header, never in cookies, so CSRF does not apply.
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // The API only answers JSON: nothing in a response may load, run or be framed
                .headers(h -> h
                        .contentSecurityPolicy(c -> c.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                        .referrerPolicy(r -> r.policy(
                                org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)))
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .logout(l -> l.disable())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> json(res, 401, "Please sign in"))
                        .accessDeniedHandler((req, res, ex) -> json(res, 403, "You do not have access to this")))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/logout",
                                "/api/public/client-errors").permitAll()
                        // API description (OpenAPI): only when app.api-docs.enabled, see application.properties
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                        .requestMatchers("/api/super-admin/**").hasRole("SUPER_ADMIN")
                        // The Associate Dean / Dean reads the college's data (never writes it through these routes)
                        .requestMatchers(HttpMethod.GET, "/api/admin/dashboard", "/api/admin/departments",
                                "/api/admin/subjects", "/api/admin/students", "/api/admin/results",
                                "/api/admin/marks", "/api/admin/marks/all", "/api/admin/publish/status",
                                "/api/admin/answer-scripts", "/api/admin/answer-scripts/file",
                                "/api/admin/internal-marks", "/api/admin/internal-marks/history",
                                "/api/admin/co-assessment", "/api/admin/co-assessment/attainment",
                                "/api/admin/internal-scheme", "/api/admin/revaluation",
                                // the faculty list only; a faculty member's full record (with Aadhaar) stays with the COE
                                "/api/admin/faculty-master").hasAnyRole("ADMIN", "DEAN")
                        .requestMatchers("/api/dean/**").hasRole("DEAN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/hod/**").hasRole("HOD")
                        .requestMatchers("/api/student/**").hasRole("STUDENT")
                        // The HOD enters marks too (mark entry and the CO sheet of their department)
                        .requestMatchers("/api/faculty/**").hasAnyRole("FACULTY", "HOD")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(new TokenAuthFilter(auth), UsernamePasswordAuthenticationFilter.class)
                // Gateways and locks are applied once the user is known (TokenAuthFilter) and before any handler runs
                .addFilterAfter(new GovernanceFilter(governance), TokenAuthFilter.class);
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** Disables Spring Boot's generated in-memory user; all logins go through AuthService. */
    @Bean
    UserDetailsService noUserDetails() {
        return username -> {
            throw new UsernameNotFoundException(username);
        };
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String origins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-College-View", "X-Request-Id"));
        config.setExposedHeaders(List.of("X-Request-Id", "X-Total-Count", "Retry-After"));
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    private static void json(jakarta.servlet.http.HttpServletResponse res, int status, String message)
            throws java.io.IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
