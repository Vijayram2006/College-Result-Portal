package edu.kvell.results.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * The signed-in user, taken from a valid session token. mustChangePassword: the account still has its starting
 * password, so only the change-password, me and logout endpoints are allowed. mfaSetupRequired: a COE account that
 * must set up two-step sign-in before anything else.
 */
public record CurrentUser(long id, String username, String name, Role role, String deptKey, String regNo,
                          String collegeKey, boolean mustChangePassword, boolean mfaSetupRequired) {

    /** SUPER_ADMIN: the overall university COE; also has every ADMIN right, in whichever college it inspects. */
    public enum Role { SUPER_ADMIN, ADMIN, HOD, STUDENT, FACULTY }

    public static CurrentUser get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CurrentUser user) {
            return user;
        }
        throw new IllegalStateException("No authenticated user");
    }

    /** The signed-in user's college, or null when nobody is signed in (startup jobs, login). */
    public static String collegeOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof CurrentUser user ? user.collegeKey() : null;
    }
}
