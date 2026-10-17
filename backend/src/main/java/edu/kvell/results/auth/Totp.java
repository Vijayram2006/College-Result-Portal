package edu.kvell.results.auth;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Locale;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Time-based one-time passwords (RFC 6238: HMAC-SHA1, 6 digits, 30-second steps), as shown by Google Authenticator,
 * Microsoft Authenticator and similar apps.
 */
public final class Totp {

    public static final int DIGITS = 6;
    public static final long STEP_SECONDS = 30;
    private static final String BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final SecureRandom RANDOM = new SecureRandom();

    private Totp() {
    }

    /** A new 160-bit secret, Base32-encoded (what the authenticator app stores). */
    public static String newSecret() {
        byte[] bytes = new byte[20];
        RANDOM.nextBytes(bytes);
        return base32(bytes);
    }

    /** The otpauth:// link that authenticator apps read from a QR code. */
    public static String uri(String issuer, String account, String secret) {
        String label = enc(issuer) + ":" + enc(account);
        return "otpauth://totp/" + label + "?secret=" + secret + "&issuer=" + enc(issuer) + "&algorithm=SHA1&digits="
                + DIGITS + "&period=" + STEP_SECONDS;
    }

    public static long step(long epochSeconds) {
        return Math.floorDiv(epochSeconds, STEP_SECONDS);
    }

    /** The code for one 30-second step. */
    public static String code(String secret, long step) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(unbase32(secret), "HmacSHA1"));
            byte[] hash = mac.doFinal(new byte[] {
                    (byte) (step >>> 56), (byte) (step >>> 48), (byte) (step >>> 40), (byte) (step >>> 32),
                    (byte) (step >>> 24), (byte) (step >>> 16), (byte) (step >>> 8), (byte) step});
            int offset = hash[hash.length - 1] & 0x0f;
            int binary = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16)
                    | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
            return String.format("%06d", binary % 1_000_000);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }

    /**
     * The step the code belongs to when it is valid now (one step of clock drift either way is allowed), or -1.
     * The caller refuses a step it has already accepted, so a code cannot be used twice.
     */
    public static long matchingStep(String secret, String entered, long epochSeconds) {
        if (secret == null || entered == null) return -1;
        String code = entered.replaceAll("\\s", "");
        if (!code.matches("\\d{" + DIGITS + "}")) return -1;
        long now = step(epochSeconds);
        for (long s = now - 1; s <= now + 1; s++) {
            if (constantTimeEquals(code(secret, s), code)) return s;
        }
        return -1;
    }

    private static boolean constantTimeEquals(String a, String b) {
        return java.security.MessageDigest.isEqual(a.getBytes(StandardCharsets.US_ASCII), b.getBytes(StandardCharsets.US_ASCII));
    }

    static String base32(byte[] data) {
        StringBuilder out = new StringBuilder();
        int buffer = 0, bits = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xff);
            bits += 8;
            while (bits >= 5) {
                out.append(BASE32.charAt((buffer >> (bits - 5)) & 31));
                bits -= 5;
            }
        }
        if (bits > 0) out.append(BASE32.charAt((buffer << (5 - bits)) & 31));
        return out.toString();
    }

    static byte[] unbase32(String text) {
        String s = text.replace("=", "").replace(" ", "").toUpperCase(Locale.ROOT);
        byte[] out = new byte[s.length() * 5 / 8];
        int buffer = 0, bits = 0, i = 0;
        for (char c : s.toCharArray()) {
            int v = BASE32.indexOf(c);
            if (v < 0) throw new IllegalArgumentException("Not Base32");
            buffer = (buffer << 5) | v;
            bits += 5;
            if (bits >= 8) {
                out[i++] = (byte) (buffer >> (bits - 8));
                bits -= 8;
            }
        }
        return out;
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
