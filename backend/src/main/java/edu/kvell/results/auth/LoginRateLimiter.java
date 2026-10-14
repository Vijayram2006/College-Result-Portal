package edu.kvell.results.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Blocks password and date-of-birth guessing: too many failed logins for one username from one IP, for one
 * username from all IPs together, or from one IP across all usernames, locks that key out for the configured
 * window. The per-username limit stops guessing spread over many addresses.
 */
@Component
public class LoginRateLimiter {

    /** One IP may fail this many times more than a single account before being blocked. */
    private static final int IP_MULTIPLIER = 4;
    /** One username may fail this many times more, counted over all IPs, before being blocked everywhere. */
    private static final int USER_MULTIPLIER = 2;
    /** Above this many tracked keys, expired ones are swept so the map cannot grow without bound. */
    private static final int SWEEP_THRESHOLD = 10_000;

    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();
    private final int maxFailures;
    private final Duration window;
    private final Clock clock;

    @Autowired
    public LoginRateLimiter(@Value("${app.auth.max-failed-logins}") int maxFailures,
                            @Value("${app.auth.lockout-minutes}") int lockoutMinutes) {
        this(maxFailures, Duration.ofMinutes(lockoutMinutes), Clock.systemUTC());
    }

    LoginRateLimiter(int maxFailures, Duration window, Clock clock) {
        this.maxFailures = maxFailures;
        this.window = window;
        this.clock = clock;
    }

    /** Minutes until the caller may retry, or 0 if not blocked. */
    public long blockedMinutes(String ip, String username) {
        Instant now = clock.instant();
        long account = remaining(accountKey(ip, username), maxFailures, now);
        long user = remaining(userKey(username), maxFailures * USER_MULTIPLIER, now);
        long address = remaining(ipKey(ip), maxFailures * IP_MULTIPLIER, now);
        return Math.max(account, Math.max(user, address));
    }

    public void recordFailure(String ip, String username) {
        Instant now = clock.instant();
        if (failures.size() > SWEEP_THRESHOLD) sweep(now);
        for (String key : new String[] {accountKey(ip, username), userKey(username), ipKey(ip)}) {
            failures.compute(key, (k, q) -> {
                Deque<Instant> queue = q == null ? new ArrayDeque<>() : q;
                prune(queue, now);
                queue.addLast(now);
                return queue;
            });
        }
    }

    public void recordSuccess(String ip, String username) {
        failures.remove(accountKey(ip, username));
    }

    private long remaining(String key, int limit, Instant now) {
        Deque<Instant> queue = failures.get(key);
        if (queue == null) return 0;
        synchronized (queue) {
            prune(queue, now);
            if (queue.size() < limit) return 0;
            Duration left = Duration.between(now, queue.peekFirst().plus(window));
            return Math.max(1, (left.toSeconds() + 59) / 60);
        }
    }

    private void prune(Deque<Instant> queue, Instant now) {
        while (!queue.isEmpty() && queue.peekFirst().plus(window).isBefore(now)) {
            queue.pollFirst();
        }
    }

    /** Drops keys whose failures have all expired. */
    private void sweep(Instant now) {
        failures.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                prune(e.getValue(), now);
                return e.getValue().isEmpty();
            }
        });
    }

    private static String accountKey(String ip, String username) {
        return "acct|" + ip + "|" + username;
    }

    private static String userKey(String username) {
        return "user|" + username;
    }

    private static String ipKey(String ip) {
        return "ip|" + ip;
    }
}
