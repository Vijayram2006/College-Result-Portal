package edu.kvell.results.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class LoginRateLimiterTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-14T00:00:00Z"), ZoneOffset.UTC);
    private final LoginRateLimiter limiter = new LoginRateLimiter(5, Duration.ofMinutes(15), clock);

    @Test
    void oneAddressIsBlockedAfterFiveFailuresForAnAccount() {
        for (int i = 0; i < 4; i++) limiter.recordFailure("10.0.0.1", "STUDENT1");
        assertEquals(0, limiter.blockedMinutes("10.0.0.1", "STUDENT1"));
        limiter.recordFailure("10.0.0.1", "STUDENT1");
        assertEquals(15, limiter.blockedMinutes("10.0.0.1", "STUDENT1"));
    }

    @Test
    void guessingSpreadOverManyAddressesStillLocksTheAccount() {
        // 10 failures, each from a different address: no single address reaches its own limit
        for (int i = 0; i < 9; i++) limiter.recordFailure("203.0.113." + i, "STUDENT1");
        assertEquals(0, limiter.blockedMinutes("198.51.100.1", "STUDENT1"));
        limiter.recordFailure("203.0.113.99", "STUDENT1");
        assertTrue(limiter.blockedMinutes("198.51.100.1", "STUDENT1") > 0, "account locked for every address");
        assertEquals(0, limiter.blockedMinutes("198.51.100.1", "STUDENT2"), "other accounts unaffected");
    }

    @Test
    void successClearsOnlyThatAddressesAccountCounter() {
        for (int i = 0; i < 4; i++) limiter.recordFailure("10.0.0.1", "STAFF");
        limiter.recordSuccess("10.0.0.1", "STAFF");
        for (int i = 0; i < 4; i++) limiter.recordFailure("10.0.0.1", "STAFF");
        assertEquals(0, limiter.blockedMinutes("10.0.0.1", "STAFF"));
        // the per-account counter over all addresses still remembers all 8 failures
        limiter.recordFailure("10.0.0.2", "STAFF");
        limiter.recordFailure("10.0.0.3", "STAFF");
        assertTrue(limiter.blockedMinutes("10.0.0.4", "STAFF") > 0);
    }

    @Test
    void passwordRules() {
        assertNotNull(AuthService.passwordProblem("short1", "old", "FACCSE"));
        assertNotNull(AuthService.passwordProblem("onlyletterspassword", "old", "FACCSE"));
        assertNotNull(AuthService.passwordProblem("12345678901", "old", "FACCSE"));
        assertNotNull(AuthService.passwordProblem("my-faccse-2026", "old", "FACCSE"));
        assertNotNull(AuthService.passwordProblem("Same-pass-2026", "Same-pass-2026", "FACCSE"));
        assertNotNull(AuthService.passwordProblem("a1".repeat(40), "old", "FACCSE"));
        assertNull(AuthService.passwordProblem("Good-pass-2026", "old-start-pass", "FACCSE"));
    }
}
