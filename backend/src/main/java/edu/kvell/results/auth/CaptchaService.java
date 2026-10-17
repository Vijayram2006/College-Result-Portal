package edu.kvell.results.auth;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * A self-hosted image challenge for the sign-in forms. After failed sign-ins from one address or for one account,
 * the next attempt must include the characters shown in a distorted picture. Each challenge is single-use and expires
 * after five minutes. (When the college has a Cloudflare account, Turnstile can replace this.)
 */
@Service
public class CaptchaService {

    public record Challenge(String id, String image) {
    }

    private record Pending(String answer, Instant expires) {
    }

    /** No 0/O, 1/I/L or 5/S, which look alike. */
    private static final String ALPHABET = "ABCDEFGHJKMNPQRTUVWXYZ2346789";
    private static final int LENGTH = 5;
    private static final long TTL_SECONDS = 300;
    private static final int MAX_PENDING = 20_000;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, Pending> pending = new ConcurrentHashMap<>();

    public Challenge create() {
        Instant now = Instant.now();
        if (pending.size() > MAX_PENDING) pending.values().removeIf(p -> p.expires().isBefore(now));
        StringBuilder answer = new StringBuilder();
        for (int i = 0; i < LENGTH; i++) answer.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        byte[] idBytes = new byte[18];
        RANDOM.nextBytes(idBytes);
        String id = Base64.getUrlEncoder().withoutPadding().encodeToString(idBytes);
        pending.put(id, new Pending(answer.toString(), now.plusSeconds(TTL_SECONDS)));
        String svg = svg(answer.toString());
        return new Challenge(id, "data:image/svg+xml;base64," + Base64.getEncoder().encodeToString(svg.getBytes()));
    }

    /** True when the answer matches; the challenge is used up either way. */
    public boolean verify(String id, String answer) {
        if (id == null || answer == null) return false;
        Pending p = pending.remove(id);
        if (p == null || p.expires().isBefore(Instant.now())) return false;
        return p.answer().equals(answer.replaceAll("\\s", "").toUpperCase(Locale.ROOT));
    }

    private static String svg(String text) {
        int w = 180, h = 60;
        StringBuilder s = new StringBuilder("<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h
                + "' viewBox='0 0 " + w + " " + h + "'><rect width='100%' height='100%' fill='#f8f5ee'/>");
        for (int i = 0; i < 6; i++) {
            s.append("<path d='M").append(RANDOM.nextInt(w)).append(' ').append(RANDOM.nextInt(h)).append(" Q")
                    .append(RANDOM.nextInt(w)).append(' ').append(RANDOM.nextInt(h)).append(' ')
                    .append(RANDOM.nextInt(w)).append(' ').append(RANDOM.nextInt(h))
                    .append("' stroke='").append(color()).append("' stroke-width='").append(1 + RANDOM.nextInt(2))
                    .append("' fill='none' opacity='0.7'/>");
        }
        for (int i = 0; i < text.length(); i++) {
            int x = 18 + i * 31 + RANDOM.nextInt(6);
            int y = 40 + RANDOM.nextInt(10) - 5;
            int rotate = RANDOM.nextInt(50) - 25;
            int size = 28 + RANDOM.nextInt(8);
            s.append("<text x='").append(x).append("' y='").append(y).append("' font-family='monospace' font-size='")
                    .append(size).append("' font-weight='bold' fill='").append(color()).append("' transform='rotate(")
                    .append(rotate).append(' ').append(x).append(' ').append(y).append(")'>").append(text.charAt(i))
                    .append("</text>");
        }
        for (int i = 0; i < 40; i++) {
            s.append("<circle cx='").append(RANDOM.nextInt(w)).append("' cy='").append(RANDOM.nextInt(h))
                    .append("' r='1' fill='").append(color()).append("'/>");
        }
        return s.append("</svg>").toString();
    }

    private static String color() {
        String[] colors = {"#0B192C", "#1f3a5f", "#7a4b00", "#2e5939", "#5b2333"};
        return colors[RANDOM.nextInt(colors.length)];
    }
}
