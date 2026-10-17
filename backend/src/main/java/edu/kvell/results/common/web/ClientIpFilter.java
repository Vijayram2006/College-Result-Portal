package edu.kvell.results.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.regex.Pattern;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * The visitor's own address for the login lockout, rate limits and the audit log. The hosted backend sits behind
 * Cloudflare, so getRemoteAddr() is a Cloudflare edge shared by many visitors; when app.client-ip-header names the
 * header the edge sets (CF-Connecting-IP), that value is used instead. Leave it empty when browsers reach the
 * backend directly, or anyone could forge their address.
 */
public class ClientIpFilter extends OncePerRequestFilter {

    private static final Pattern IP = Pattern.compile("^[0-9A-Fa-f:.]{2,45}$");

    private final String header;

    public ClientIpFilter(String header) {
        this.header = header == null ? "" : header.trim();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String client = header.isEmpty() ? null : request.getHeader(header);
        if (client == null || !IP.matcher(client.trim()).matches()) {
            chain.doFilter(request, response);
            return;
        }
        String address = client.trim();
        chain.doFilter(new HttpServletRequestWrapper(request) {
            @Override
            public String getRemoteAddr() {
                return address;
            }

            @Override
            public String getRemoteHost() {
                return address;
            }
        }, response);
    }
}
