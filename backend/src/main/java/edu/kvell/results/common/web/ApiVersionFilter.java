package edu.kvell.results.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Version 1 of the API lives at /api/v1/...; the unversioned /api/... paths still work during the deprecation period
 * and answer with a Deprecation header pointing at /api/v1. A future v2 gets its own controllers, so one frontend's
 * upgrade never breaks the other.
 */
public class ApiVersionFilter extends OncePerRequestFilter {

    static final String V1 = "/api/v1/";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        String path = uri.substring(context.length());
        response.setHeader("API-Version", "1");
        if (path.startsWith(V1)) {
            String inner = "/api/" + path.substring(V1.length());
            chain.doFilter(new HttpServletRequestWrapper(request) {
                @Override
                public String getRequestURI() {
                    return context + inner;
                }

                @Override
                public StringBuffer getRequestURL() {
                    StringBuffer url = new StringBuffer();
                    url.append(getScheme()).append("://").append(getServerName());
                    int port = getServerPort();
                    if (port > 0 && port != 80 && port != 443) url.append(':').append(port);
                    return url.append(context).append(inner);
                }

                @Override
                public String getServletPath() {
                    return inner;
                }

                @Override
                public String getPathInfo() {
                    return null;
                }
            }, response);
            return;
        }
        if (path.startsWith("/api/")) {
            response.setHeader("Deprecation", "true");
            response.setHeader("Link", "<" + context + "/api/v1/" + path.substring(5) + ">; rel=\"successor-version\"");
        }
        chain.doFilter(request, response);
    }
}
