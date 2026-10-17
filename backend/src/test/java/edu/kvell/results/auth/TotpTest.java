package edu.kvell.results.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** RFC 6238 appendix B test values (SHA-1 secret "12345678901234567890"), last six digits. */
class TotpTest {

    private static final String SECRET = Totp.base32("12345678901234567890".getBytes(StandardCharsets.US_ASCII));

    @Test
    void rfc6238Vectors() {
        assertEquals("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", SECRET);
        assertEquals("287082", Totp.code(SECRET, Totp.step(59)));
        assertEquals("081804", Totp.code(SECRET, Totp.step(1111111109)));
        assertEquals("050471", Totp.code(SECRET, Totp.step(1111111111)));
        assertEquals("005924", Totp.code(SECRET, Totp.step(1234567890)));
        assertEquals("279037", Totp.code(SECRET, Totp.step(2000000000)));
    }

    @Test
    void acceptsOneStepOfDriftOnly() {
        long now = 1_700_000_000L;
        long step = Totp.step(now);
        assertEquals(step, Totp.matchingStep(SECRET, Totp.code(SECRET, step), now));
        assertEquals(step - 1, Totp.matchingStep(SECRET, Totp.code(SECRET, step - 1), now));
        assertEquals(step + 1, Totp.matchingStep(SECRET, Totp.code(SECRET, step + 1), now));
        assertEquals(-1, Totp.matchingStep(SECRET, Totp.code(SECRET, step - 2), now));
        assertEquals(-1, Totp.matchingStep(SECRET, "12345", now));
        assertEquals(-1, Totp.matchingStep(SECRET, "abcdef", now));
        assertEquals(-1, Totp.matchingStep(null, "123456", now));
    }

    @Test
    void base32RoundTrip() {
        String secret = Totp.newSecret();
        assertEquals(32, secret.length());
        assertEquals(secret, Totp.base32(Totp.unbase32(secret)));
    }

    @Test
    void uriForAuthenticatorApps() {
        String uri = Totp.uri("KVELL Result Portal", "COE", "ABC");
        assertTrue(uri.startsWith("otpauth://totp/KVELL%20Result%20Portal:COE?secret=ABC"));
    }
}
