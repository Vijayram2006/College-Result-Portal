package edu.kvell.results.auth;

import edu.kvell.results.auth.CurrentUser.Role;
import edu.kvell.results.common.ApiException;
import edu.kvell.results.common.AuditService;
import edu.kvell.results.governance.GovernanceService;
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

    /** otp: the authenticator-app code (or a recovery code) for COEs; captcha*: the picture challenge, when asked. */
    public record LoginRequest(String username, String password, String role, String otp, String captchaId,
                               String captchaAnswer) {
    }

    public record MfaSetup(String secret, String otpauthUri) {
    }

    public record MfaEnableRequest(String code) {
    }

    public record MfaEnabled(List<String> recoveryCodes) {
    }

    /** role is COE_ENGINEERING / COE_NURSING / COE_PHARMACY for a Controller of Examinations. */
    /** mustChangePassword: the account still has its starting password and must choose a new one first. */
    /** mfaSetupRequired: a COE account that must set up two-step sign-in before using the panel. */
    public record UserView(long id, String username, String name, String role,
                           String departmentKey, String departmentName, String regNo,
                           String collegeKey, String collegeName, boolean mustChangePassword,
                           boolean mfaEnabled, boolean mfaSetupRequired) {
    }

    public record LoginResponse(String token, String role, UserView user) {
    }

    public record ChangePasswordRequest(String currentPassword, String newPassword) {
    }

    /** A staff member's own profile; username, role, college and department are shown but never edited here. */
    public record ProfileView(String username, String name, String email, String phone, String designation,
                              String role, String collegeName, String departmentName, Instant lastLoginAt) {
    }

    public record ProfileUpdate(String name, String email, String phone, String designation) {
    }

    private static final java.util.regex.Pattern EMAIL =
            java.util.regex.Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final java.util.regex.Pattern PHONE = java.util.regex.Pattern.compile("^\\+?[0-9 ()-]{7,20}$");

    private record UserRow(long id, String username, String passwordHash, String role, String displayName,
                           String deptKey, String deptName, String regNo, LocalDate dob, boolean enabled,
                           String collegeKey, boolean mustChangePassword, boolean totpEnabled, String totpSecret,
                           Long totpLastStep) {
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
    private final GovernanceService governance;
    private final CaptchaService captcha;
    private final long tokenHours;
    private final long adminIdleMinutes;
    private final long idleMinutes;
    private final boolean mfaRequired;
    /** Compared against when the username does not exist, so timing does not reveal valid usernames. */
    private final String dummyHash;

    public AuthService(JdbcClient db, PasswordEncoder encoder, LoginRateLimiter rateLimiter, AuditService audit,
                       GovernanceService governance, CaptchaService captcha,
                       @Value("${app.auth.token-hours}") long tokenHours,
                       @Value("${app.auth.admin-idle-minutes:30}") long adminIdleMinutes,
                       @Value("${app.auth.idle-minutes:120}") long idleMinutes,
                       @Value("${app.auth.mfa-required:true}") boolean mfaRequired) {
        this.db = db;
        this.encoder = encoder;
        this.rateLimiter = rateLimiter;
        this.audit = audit;
        this.governance = governance;
        this.captcha = captcha;
        this.tokenHours = tokenHours;
        this.adminIdleMinutes = adminIdleMinutes;
        this.idleMinutes = idleMinutes;
        this.mfaRequired = mfaRequired;
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
        // After failed attempts, a picture challenge must be solved first (it is used up by this attempt)
        if (rateLimiter.needsCaptcha(ip, username) && !captcha.verify(request.captchaId(), request.captchaAnswer())) {
            boolean tried = request.captchaId() != null && !request.captchaId().isBlank();
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    tried ? "The characters did not match. Try the new picture." : "Type the characters shown in the picture.",
                    java.util.Map.of("captchaRequired", true, "captcha", captcha.create()));
        }

        Optional<UserRow> found = findUser(username);
        boolean credentialOk = portal == Role.STUDENT
                ? dobMatches(found, password)
                : encoder.matches(password, found.map(UserRow::passwordHash).orElse(dummyHash));
        if (found.isEmpty() || !credentialOk || !portalAccepts(portal, found.get().role())) {
            rateLimiter.recordFailure(ip, username);
            throw new ApiException(HttpStatus.UNAUTHORIZED, invalid);
        }

        UserRow user = found.get();
        // Controllers of Examinations confirm with a code from their authenticator app (or a recovery code)
        if (portal == Role.ADMIN && user.enabled() && user.totpEnabled()) {
            String otp = request.otp() == null ? "" : request.otp().trim();
            if (otp.isEmpty()) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Enter the 6-digit code from your authenticator app.",
                        java.util.Map.of("otpRequired", true));
            }
            if (!acceptOtp(user, otp, ip)) {
                rateLimiter.recordFailure(ip, username);
                throw new ApiException(HttpStatus.UNAUTHORIZED, "The code is not correct or has already been used.",
                        java.util.Map.of("otpRequired", true));
            }
        }
        rateLimiter.recordSuccess(ip, username);
        // Only told once the password is right, so this never reveals which accounts exist
        if (!user.enabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This account is suspended. Contact the Super Admin.");
        }
        if (portal == Role.STUDENT && governance.studentPortalClosed()) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "The student result portal is closed by the Controller of Examinations. Please try again later.");
        }
        db.sql("UPDATE users SET last_login_at = now() WHERE id = ?").param(user.id()).update();
        db.sql("DELETE FROM auth_tokens WHERE expires_at < now()").update();

        String token = newToken();
        db.sql("INSERT INTO auth_tokens (token_hash, user_id, expires_at, last_used_at) VALUES (?, ?, ?, now())")
                .params(sha256(token), user.id(), Timestamp.from(Instant.now().plus(tokenHours, ChronoUnit.HOURS)))
                .update();

        if (portal == Role.ADMIN) {
            audit.record(user.username(), user.displayName(), "ADMIN_LOGIN", user.username(),
                    "Signed in to the examination control panel.", ip);
        }
        UserView view = view(user);
        return new LoginResponse(token, view.role(), view);
    }

    private record Found(CurrentUser user, boolean stale) {
    }

    /**
     * Resolves a bearer token to its user, if the token is valid, unexpired and was used recently: a COE session ends
     * after app.auth.admin-idle-minutes without activity, every other session after app.auth.idle-minutes.
     */
    public Optional<CurrentUser> authenticate(String token) {
        String hash = sha256(token);
        Optional<Found> found = db.sql("""
                        SELECT u.id, u.username, u.display_name, u.role, u.dept_key, u.reg_no,
                               coalesce(u.college_key, d.college_key) AS college_key, u.must_change_password,
                               u.totp_enabled, t.last_used_at < now() - interval '60 seconds' AS stale
                        FROM auth_tokens t JOIN users u ON u.id = t.user_id
                        LEFT JOIN departments d ON d.dept_key = u.dept_key
                        WHERE t.token_hash = :hash AND t.expires_at > now() AND u.enabled
                          AND t.last_used_at > now() - make_interval(mins => CASE WHEN u.role IN ('ADMIN', 'SUPER_ADMIN')
                                                                      THEN :adminIdle ELSE :idle END)
                        """)
                .param("hash", hash).param("adminIdle", (int) adminIdleMinutes).param("idle", (int) idleMinutes)
                .query((rs, n) -> {
                    Role role = Role.valueOf(rs.getString("role"));
                    boolean setup = mfaRequired && isOfficer(role) && !rs.getBoolean("totp_enabled");
                    return new Found(new CurrentUser(rs.getLong("id"), rs.getString("username"),
                            rs.getString("display_name"), role, rs.getString("dept_key"), rs.getString("reg_no"),
                            rs.getString("college_key"), rs.getBoolean("must_change_password"), setup),
                            rs.getBoolean("stale"));
                })
                .optional();
        // Last use is written at most once a minute, not on every request
        found.filter(Found::stale).ifPresent(f ->
                db.sql("UPDATE auth_tokens SET last_used_at = now() WHERE token_hash = ?").param(hash).update());
        return found.map(Found::user);
    }

    private static boolean isOfficer(Role role) {
        return role == Role.ADMIN || role == Role.SUPER_ADMIN;
    }

    /** A current authenticator code (never one already used) or an unused recovery code. */
    private boolean acceptOtp(UserRow user, String otp, String ip) {
        long step = Totp.matchingStep(user.totpSecret(), otp, Instant.now().getEpochSecond());
        if (step >= 0) {
            if (user.totpLastStep() != null && step <= user.totpLastStep()) return false;
            return db.sql("UPDATE users SET totp_last_step = ? WHERE id = ? AND (totp_last_step IS NULL OR totp_last_step < ?)")
                    .params(step, user.id(), step).update() == 1;
        }
        String hash = sha256(otp.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT));
        int used = db.sql("""
                        UPDATE users SET totp_recovery = array_remove(totp_recovery, ?)
                        WHERE id = ? AND ? = ANY(totp_recovery)
                        """)
                .params(hash, user.id(), hash).update();
        if (used == 1) {
            audit.record(user.username(), user.displayName(), "USED_MFA_RECOVERY_CODE", user.username(),
                    "Signed in with a two-step recovery code.", ip);
            return true;
        }
        return false;
    }

    /** Starts two-step sign-in set-up: a new secret for the authenticator app (not active until confirmed). */
    public MfaSetup mfaSetup(CurrentUser current) {
        if (!isOfficer(current.role())) throw new ApiException(HttpStatus.FORBIDDEN, "Two-step sign-in is for COE accounts");
        UserRow user = findUser(current.username())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired"));
        if (user.totpEnabled()) throw ApiException.conflict("Two-step sign-in is already set up for this account.");
        String secret = Totp.newSecret();
        db.sql("UPDATE users SET totp_secret = ? WHERE id = ?").params(secret, user.id()).update();
        return new MfaSetup(secret, Totp.uri("KVELL Result Portal", user.username(), secret));
    }

    /** Confirms set-up with a first code from the app; returns eight one-time recovery codes (shown once). */
    public MfaEnabled mfaEnable(CurrentUser current, MfaEnableRequest request, String ip) {
        if (!isOfficer(current.role())) throw new ApiException(HttpStatus.FORBIDDEN, "Two-step sign-in is for COE accounts");
        UserRow user = findUser(current.username())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired"));
        if (user.totpEnabled()) throw ApiException.conflict("Two-step sign-in is already set up for this account.");
        if (user.totpSecret() == null) throw ApiException.badRequest("Start the set-up first.");
        long step = Totp.matchingStep(user.totpSecret(), request == null ? null : request.code(),
                Instant.now().getEpochSecond());
        if (step < 0) throw ApiException.badRequest("The code is not correct. Check the time on your phone and try again.");
        List<String> codes = new java.util.ArrayList<>();
        List<String> hashes = new java.util.ArrayList<>();
        for (int i = 0; i < 8; i++) {
            String code = recoveryCode();
            codes.add(code.substring(0, 5) + "-" + code.substring(5));
            hashes.add(sha256(code));
        }
        db.sql("UPDATE users SET totp_enabled = TRUE, totp_last_step = ?, totp_recovery = CAST(? AS TEXT[]) WHERE id = ?")
                .params(step, "{" + String.join(",", hashes) + "}", user.id()).update();
        audit.record(user.username(), user.displayName(), "ENABLED_MFA", user.username(),
                "Set up two-step sign-in with an authenticator app.", ip);
        return new MfaEnabled(codes);
    }

    private static String recoveryCode() {
        String alphabet = "ABCDEFGHJKMNPQRTUVWXYZ2346789";
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < 10; i++) b.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        return b.toString();
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
    public static String passwordProblem(String password, String oldPassword, String username) {
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

    public ProfileView profile(CurrentUser current) {
        requireStaff(current);
        UserView view = me(current);
        return db.sql("SELECT display_name, email, phone, designation, last_login_at FROM users WHERE id = ?")
                .param(view.id())
                .query((rs, n) -> new ProfileView(view.username(), rs.getString("display_name"), rs.getString("email"),
                        rs.getString("phone"), rs.getString("designation"), view.role(), view.collegeName(),
                        view.departmentName(),
                        rs.getTimestamp("last_login_at") == null ? null : rs.getTimestamp("last_login_at").toInstant()))
                .single();
    }

    /** Staff (COEs, the Chief COE, HODs, faculty) edit their own name and contact details. */
    public ProfileView updateProfile(CurrentUser current, ProfileUpdate request, String ip) {
        requireStaff(current);
        if (request == null) throw ApiException.badRequest("Nothing to save");
        String name = trimToNull(request.name());
        String email = trimToNull(request.email());
        String phone = trimToNull(request.phone());
        String designation = trimToNull(request.designation());
        if (name == null || name.length() < 2 || name.length() > 100) {
            throw ApiException.badRequest("Enter a name of 2 to 100 characters");
        }
        if (email != null && (email.length() > 120 || !EMAIL.matcher(email).matches())) {
            throw ApiException.badRequest("Enter a valid email address");
        }
        if (phone != null && !PHONE.matcher(phone).matches()) {
            throw ApiException.badRequest("Enter a valid phone number (digits, spaces, +, - or brackets; 7 to 20 characters)");
        }
        if (designation != null && designation.length() > 80) {
            throw ApiException.badRequest("The designation must be at most 80 characters");
        }
        db.sql("UPDATE users SET display_name = ?, email = ?, phone = ?, designation = ? WHERE id = ?")
                .params(name, email, phone, designation, current.id()).update();
        audit.record(current.username(), name, "UPDATED_PROFILE", current.username(),
                "Updated own profile (name, email, phone, designation).", ip);
        return profile(current);
    }

    private static void requireStaff(CurrentUser current) {
        if (current.role() == Role.STUDENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Student details are kept by the Controller of Examinations");
        }
    }

    private static String trimToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    public UserView me(CurrentUser current) {
        return findUser(current.username()).map(this::view)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Session expired"));
    }

    private Optional<UserRow> findUser(String username) {
        return db.sql("""
                        SELECT u.id, u.username, u.password_hash, u.role, u.display_name, u.dept_key,
                               d.name AS dept_name, u.reg_no, s.dob, u.enabled,
                               coalesce(u.college_key, d.college_key) AS college_key, u.must_change_password,
                               u.totp_enabled, u.totp_secret, u.totp_last_step
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
                        rs.getString("college_key"), rs.getBoolean("must_change_password"),
                        rs.getBoolean("totp_enabled"), rs.getString("totp_secret"),
                        rs.getObject("totp_last_step", Long.class)))
                .optional();
    }

    private UserView view(UserRow u) {
        String college = u.collegeKey() == null ? "engineering" : u.collegeKey();
        if ("SUPER_ADMIN".equals(u.role())) {
            return new UserView(u.id(), u.username(), u.displayName(), "SUPER_ADMIN", null, null, null, college,
                    "Karpaga Vinayaga Educational Group (Central University)", u.mustChangePassword(), u.totpEnabled(),
                    mfaRequired && !u.totpEnabled());
        }
        String role = "ADMIN".equals(u.role()) ? "COE_" + college.toUpperCase(Locale.ROOT) : u.role();
        boolean officer = "ADMIN".equals(u.role());
        return new UserView(u.id(), u.username(), u.displayName(), role, u.deptKey(), u.deptName(), u.regNo(),
                college, COLLEGE_NAMES.getOrDefault(college, college), u.mustChangePassword(), u.totpEnabled(),
                officer && mfaRequired && !u.totpEnabled());
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
    /** The admin portal is for college COEs and the Super Admin; every other portal takes only its own role. */
    private static boolean portalAccepts(Role portal, String accountRole) {
        if (portal == Role.ADMIN) return "ADMIN".equals(accountRole) || "SUPER_ADMIN".equals(accountRole);
        return portal.name().equals(accountRole);
    }

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

    public static String normalize(String username) {
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
