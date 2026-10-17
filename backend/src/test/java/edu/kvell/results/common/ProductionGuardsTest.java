package edu.kvell.results.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import edu.kvell.results.auth.CaptchaService;
import edu.kvell.results.common.web.ApiVersionFilter;
import edu.kvell.results.common.web.ClientIpFilter;
import edu.kvell.results.common.web.RequestRateLimitFilter;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** CAPTCHA, cache, API versioning, rate limit, client address and the experience rule. */
class ProductionGuardsTest {

    @Test
    void captchaIsSingleUseAndCaseInsensitive() throws Exception {
        CaptchaService captcha = new CaptchaService();
        CaptchaService.Challenge c = captcha.create();
        assertTrue(c.image().startsWith("data:image/svg+xml;base64,"));
        assertFalse(captcha.verify(c.id(), "WRONG"));
        assertFalse(captcha.verify(c.id(), "anything"), "a failed attempt uses the challenge up");
        assertFalse(captcha.verify(null, "X"));
        assertFalse(captcha.verify("unknown", "X"));
    }

    @Test
    void cacheLoadsOnceAndClears() {
        ResultsCache cache = new ResultsCache();
        AtomicInteger loads = new AtomicInteger();
        assertEquals("v1", cache.get("k", () -> "v" + loads.incrementAndGet()));
        assertEquals("v1", cache.get("k", () -> "v" + loads.incrementAndGet()));
        assertEquals(1, loads.get());
        cache.clear();
        assertEquals("v2", cache.get("k", () -> "v" + loads.incrementAndGet()));
    }

    @Test
    void apiV1ReachesTheSameHandlers() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/public/summary");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        new ApiVersionFilter().doFilter(req, res, chain);
        assertEquals("/api/public/summary", ((jakarta.servlet.http.HttpServletRequest) chain.getRequest()).getRequestURI());
        assertEquals("1", res.getHeader("API-Version"));

        MockHttpServletResponse old = new MockHttpServletResponse();
        new ApiVersionFilter().doFilter(new MockHttpServletRequest("GET", "/api/public/summary"), old, new MockFilterChain());
        assertEquals("true", old.getHeader("Deprecation"));
    }

    @Test
    void rateLimitAnswers429AboveTheLimit() throws Exception {
        RequestRateLimitFilter filter = new RequestRateLimitFilter(3, 100);
        int last = 0;
        for (int i = 0; i < 4; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/public/summary");
            req.setRemoteAddr("203.0.113.9");
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, new MockFilterChain());
            last = res.getStatus();
        }
        assertEquals(429, last);
        MockHttpServletRequest other = new MockHttpServletRequest("GET", "/api/public/summary");
        other.setRemoteAddr("203.0.113.10");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(other, res, new MockFilterChain());
        assertEquals(200, res.getStatus(), "another visitor is not affected");
    }

    @Test
    void clientIpHeaderIsUsedOnlyWhenConfigured() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/public/summary");
        req.setRemoteAddr("172.69.1.1");
        req.addHeader("CF-Connecting-IP", "198.51.100.7");
        MockFilterChain chain = new MockFilterChain();
        new ClientIpFilter("CF-Connecting-IP").doFilter(req, new MockHttpServletResponse(), chain);
        assertEquals("198.51.100.7", chain.getRequest().getRemoteAddr());

        MockFilterChain plain = new MockFilterChain();
        new ClientIpFilter("").doFilter(req, new MockHttpServletResponse(), plain);
        assertEquals("172.69.1.1", plain.getRequest().getRemoteAddr(), "never trusted unless configured");

        MockHttpServletRequest forged = new MockHttpServletRequest("GET", "/api/public/summary");
        forged.setRemoteAddr("172.69.1.1");
        forged.addHeader("CF-Connecting-IP", "<script>");
        MockFilterChain f = new MockFilterChain();
        new ClientIpFilter("CF-Connecting-IP").doFilter(forged, new MockHttpServletResponse(), f);
        assertEquals("172.69.1.1", f.getRequest().getRemoteAddr(), "garbage is ignored");
    }
}
