package edu.kvell.results.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Requests per visitor address per minute, counted separately for the public part (sign-in, public summary, the
 * student portal before sign-in) and for signed-in calls (which carry a token). Above the limit the API answers 429
 * until the minute is over. Login guessing has its own, stricter limit in LoginRateLimiter.
 */
public class RequestRateLimitFilter extends OncePerRequestFilter {

    private static final int SWEEP_THRESHOLD = 20_000;

    private record Window(long minute, AtomicInteger count) {
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final int publicPerMinute;
    private final int signedInPerMinute;

    public RequestRateLimitFilter(int publicPerMinute, int signedInPerMinute) {
        this.publicPerMinute = publicPerMinute;
        this.signedInPerMinute = signedInPerMinute;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/") || "OPTIONS".equals(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        boolean signedIn = auth != null && auth.startsWith("Bearer ");
        // Signed-in calls are counted per token, so a whole college office behind one address is not lumped together
        String key = signedIn ? "t:" + Integer.toHexString(auth.hashCode()) + ":" + request.getRemoteAddr()
                : "p:" + request.getRemoteAddr();
        int limit = signedIn ? signedInPerMinute : publicPerMinute;
        long minute = System.currentTimeMillis() / 60_000;
        if (windows.size() > SWEEP_THRESHOLD) windows.values().removeIf(w -> w.minute() < minute);
        Window w = windows.compute(key, (k, old) -> old == null || old.minute() != minute
                ? new Window(minute, new AtomicInteger()) : old);
        if (w.count().incrementAndGet() > limit) {
            long wait = 60 - (System.currentTimeMillis() / 1000) % 60;
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(wait));
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many requests. Please wait a minute and try again.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
