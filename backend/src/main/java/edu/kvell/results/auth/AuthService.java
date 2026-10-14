package edu.kvell.results.auth;

import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    public record LoginRequest(String username, String password, String role) {
    }

    /** role is COE_ENGINEERING / COE_NURSING / COE_PHARMACY for a Controller of Examinations. */
    /** mustChangePassword: the account still has its starting password and must choose a new one first. */
    public record UserView(long id, String username, String name, String role,
                           String departmentKey, String departmentName, String regNo,
                           String collegeKey, String collegeName, boolean mustChangePassword) {
    }

    public record LoginResponse(String token, String role, UserView user) {
    }

    public record ChangePasswordRequest(String currentPassword, String newPassword) {
    }

    private record UserRow(long id, String username, String passwordHash, String role, String displayName,
                           String deptKey, String deptName, String regNo, LocalDate dob, boolean enabled,
                           String collegeKey, boolean mustChangePassword) {
    }

    private static final int MIN_PASSWORD_LENGTH = 10;
    private static final int MAX_PASSWORD_LENGTH = 72; // bcrypt ignores anything longer

    private static final java.util.Map<String, String> COLLEGE_NAMES = java.util.Map.of(
            "engineering", "Karpaga Vinayaga College of Engineering and Technology",
            "nursing", "Karpaga Vinayaga College of Nursing",
            "pharmacy", "Karpaga Vinayaga Institute for Pharmaceutical Sciences");

    private static final String INVALID = "Invalid username or password";
    private static final String INVALID_STUDENT = "Invalid register number or date of birth";
    /** Date-of-birth formats a student may type: 2007-03-14, 14-03-2007, 14/03/2007. */
    private static final List<DateTimeFormatter> DOB_FORMATS = List.of(
            DateTimeFormatter.ofPattern("uuuu-MM-dd"),
            DateTimeFormatter.ofPattern("dd-MM-uuuu"),
            DateTimeFormatter.ofPattern("dd/MM/uuuu"));
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient db;
    private final PasswordEncoder encoder;
    private final LoginRateLimiter rateLimiter;
    private final AuditService audit;
    private final long tokenHours;
    /** Compared against when the username does not exist, so timing does not reveal valid usernames. */
    private final String dummyHash;

    public AuthService(JdbcClient db, PasswordEncoder encoder, LoginRateLimiter rateLimiter, AuditService audit,
                       @Value("${app.auth.token-hours}") long tokenHours) {
        this.db = db;
        this.encoder = encoder;
        this.rateLimiter = rateLimiter;
        this.audit = audit;
        this.tokenHours = tokenHours;
        this.dummyHash = encoder.encode("not-a-real-password");
    }

    public LoginResponse login(LoginRequest request, String ip) {
        String username = normalize(request.username());
        String password = request.password() == null ? "" : request.password();
        Role portal = portalRole(request.role());
        String invalid = portal == Role.STUDENT ? INVALID_STUDENT : INVALID;
        if (username.isEmpty() || password.isEmpty() || portal == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, invalid);
        }

        long blocked = rateLimiter.blockedMinutes(ip, username);
        if (blocked > 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed attempts. Try again in " + blocked + " minute" + (blocked == 1 ? "" : "s") + ".");
        }

        Optional<UserRow> found = findUser(username);
        boolean credentialOk = portal == Role.STUDENT
                ? dobMatches(found, password)
                : encoder.matches(password, found.map(UserRow::passwordHash).orElse(dummyHash));
        if (found.isEmpty() || !credentialOk || !found.get().enabled() || !found.get().role().equals(portal.name())) {
            rateLimiter.recordFailure(ip, username);
            throw new ApiException(HttpStatus.UNAUTHORIZED, invalid);
        }

        UserRow user = found.get();
        rateLimiter.recordSuccess(ip, username);
        db.sql("DELETE FROM auth_tokens WHERE expires_at < now()").update();

        String token = newToken();
        db.sql("INSERT INTO auth_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
                .params(sha256(token), user.id(), Timestamp.from(Instant.now().plus(tokenHours, ChronoUnit.HOURS)))
                .update();

        if (portal == Role.ADMIN) {
            audit.record(user.username(), user.displayName(), "ADMIN_LOGIN", user.username(),
                    "Signed in to the examination control panel.", ip);
        }
        UserView view = view(user);
        return new LoginResponse(token, view.role(), view);
    }

    /** Resolves a bearer token to its user, if the token is valid and unexpired. */
    public Optional<CurrentUser> authenticate(String token) {
        return db.sql("""
                        SELECT u.id, u.username, u.display_name, u.role, u.dept_key, u.reg_no,
                               coalesce(u.college_key, d.college_key) AS college_key, u.must_change_password
                        FROM auth_tokens t JOIN users u ON u.id = t.user_id
                        LEFT JOIN departments d ON d.dept_key = u.dept_key
                        WHERE t.token_hash = ? AND t.expires_at > now() AND u.enabled
                        """)
                .param(sha256(token))
                .query((rs, n) -> new CurrentUser(rs.getLong("id"), rs.getString("username"),
                        rs.getString("display_name"), Role.valueOf(rs.getString("role")),
                        rs.getString("dept_key"), rs.getString("reg_no"), rs.getString("college_key"),
                        rs.getBoolean("must_change_password")))
                .optional();
    }

    public void logout(String token) {
        db.sql("DELETE FROM auth_tokens WHERE token_hash = ?").param(sha256(token)).update();
    }

    /**
     * A staff member replaces their password (students sign in with their date of birth and have none). The current
     * password is checked and wrong guesses count towards the login lockout; every other session is signed out.
     */
    public UserView changePassword(CurrentUser current, ChangePasswordRequest request, String token, String ip) {
        if (current.role() == Role.STUDENT) {
            throw ApiException.badRequest("Students sign in with their date of birth and have no password to change");
        }
        String oldPassword = request == null || request.currentPassword() == null ? "" : request.currentPassword();
        String newPassword = request == null || request.newPassword() == null ? "" : request.newPassword();
        long blocked = rateLimiter.blockedMinutes(ip, current.username());
        if (blocked > 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed attempts. Try again in " + blocked + " minute" + (blocked == 1 ? "" : "s") + ".");
        }
        UserRow user = findUser(current.username())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired"));
        if (!encoder.matches(oldPassword, user.passwordHash())) {
            rateLimiter.recordFailure(ip, current.username());
            throw ApiException.badRequest("The current password is not correct");
        }
        String problem = passwordProblem(newPassword, oldPassword, current.username());
        if (problem != null) throw ApiException.badRequest(problem);

        db.sql("UPDATE users SET password_hash = ?, must_change_password = FALSE WHERE id = ?")
                .params(encoder.encode(newPassword), user.id()).update();
        db.sql("DELETE FROM auth_tokens WHERE user_id = ? AND token_hash <> ?")
                .params(user.id(), sha256(token)).update();
        audit.record(user.username(), user.displayName(), "CHANGED_PASSWORD", user.username(),
                "Changed the account password; other sessions were signed out.", ip);
        return me(current);
    }

    /** Why a new password is not acceptable, or null when it is. */
    static String passwordProblem(String password, String oldPassword, String username) {
        if (password.length() < MIN_PASSWORD_LENGTH) {
            return "The new password must be at least " + MIN_PASSWORD_LENGTH + " characters long";
        }
        if (password.length() > MAX_PASSWORD_LENGTH) {
            return "The new password must be at most " + MAX_PASSWORD_LENGTH + " characters long";
        }
        if (!password.chars().anyMatch(Character::isLetter) || !password.chars().anyMatch(Character::isDigit)) {
            return "The new password must contain both letters and digits";
        }
        if (password.equals(oldPassword)) return "The new password must be different from the current one";
        if (password.toUpperCase(Locale.ROOT).contains(username.toUpperCase(Locale.ROOT))) {
            return "The new password must not contain the username";
        }
        return null;
    }

    public UserView me(CurrentUser current) {
        return findUser(current.username()).map(AuthService::view)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired"));
    }

    private Optional<UserRow> findUser(String username) {
        return db.sql("""
                        SELECT u.id, u.username, u.password_hash, u.role, u.display_name, u.dept_key,
                               d.name AS dept_name, u.reg_no, s.dob, u.enabled,
                               coalesce(u.college_key, d.college_key) AS college_key, u.must_change_password
                        FROM users u
                        LEFT JOIN departments d ON d.dept_key = u.dept_key
                        LEFT JOIN students s ON s.reg_no = u.reg_no
                        WHERE u.username = ?
                        """)
                .param(username)
                .query((rs, n) -> new UserRow(rs.getLong("id"), rs.getString("username"),
                        rs.getString("password_hash"), rs.getString("role"), rs.getString("display_name"),
                        rs.getString("dept_key"), rs.getString("dept_name"), rs.getString("reg_no"),
                        rs.getObject("dob", LocalDate.class), rs.getBoolean("enabled"),
                        rs.getString("college_key"), rs.getBoolean("must_change_password")))
                .optional();
    }

    private static UserView view(UserRow u) {
        String college = u.collegeKey() == null ? "engineering" : u.collegeKey();
        String role = "ADMIN".equals(u.role()) ? "COE_" + college.toUpperCase(Locale.ROOT) : u.role();
        return new UserView(u.id(), u.username(), u.displayName(), role, u.deptKey(), u.deptName(), u.regNo(),
                college, COLLEGE_NAMES.getOrDefault(college, college), u.mustChangePassword());
    }

    /** Students sign in with their date of birth instead of a password. */
    private boolean dobMatches(Optional<UserRow> user, String entered) {
        // Same bcrypt cost as a password check, so response time does not reveal valid register numbers
        encoder.matches(entered, dummyHash);
        LocalDate dob = parseDob(entered);
        return dob != null && user.map(UserRow::dob).filter(dob::equals).isPresent();
    }

    public static LocalDate parseDob(String value) {
        for (DateTimeFormatter format : DOB_FORMATS) {
            try {
                return LocalDate.parse(value.trim(), format.withResolverStyle(ResolverStyle.STRICT));
            } catch (DateTimeParseException ignored) {
                // try the next format
            }
        }
        return null;
    }

    /** The login form's portal tab. */
    private static Role portalRole(String role) {
        if (role == null) return null;
        return switch (role.trim().toLowerCase(Locale.ROOT)) {
            case "admin" -> Role.ADMIN;
            case "hod" -> Role.HOD;
            case "faculty" -> Role.FACULTY;
            case "student" -> Role.STUDENT;
            default -> null;
        };
    }

    static String normalize(String username) {
        return username == null ? "" : username.trim().toUpperCase(Locale.ROOT);
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String sha256(String value) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
