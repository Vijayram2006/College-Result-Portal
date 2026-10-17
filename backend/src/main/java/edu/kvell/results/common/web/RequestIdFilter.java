package edu.kvell.results.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Gives every request an id (the caller's X-Request-Id when it is a safe value, else a new one), puts it in the log
 * context and the response, and logs one line per API request: method, path (never the query string, which may hold
 * a register number), status and time. Tokens and passwords are never logged.
 */
public class RequestIdFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Request-Id";
    private static final Pattern SAFE = Pattern.compile("^[A-Za-z0-9-]{8,64}$");
    private static final Logger log = LoggerFactory.getLogger("http");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String given = request.getHeader(HEADER);
        String id = given != null && SAFE.matcher(given).matches() ? given : UUID.randomUUID().toString();
        long start = System.nanoTime();
        MDC.put("requestId", id);
        response.setHeader(HEADER, id);
        try {
            chain.doFilter(request, response);
        } finally {
            if (request.getRequestURI().startsWith("/api/")) {
                long ms = (System.nanoTime() - start) / 1_000_000;
                int status = response.getStatus();
                if (status >= 500) {
                    log.error("{} {} -> {} in {} ms", request.getMethod(), request.getRequestURI(), status, ms);
                } else {
                    log.info("{} {} -> {} in {} ms", request.getMethod(), request.getRequestURI(), status, ms);
                }
            }
            MDC.remove("requestId");
        }
    }
}
