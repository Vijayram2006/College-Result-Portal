package edu.kvell.results.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * The signed-in user, taken from a valid session token. mustChangePassword: the account still has its starting
 * password, so only the change-password, me and logout endpoints are allowed.
 */
public record CurrentUser(long id, String username, String name, Role role, String deptKey, String regNo,
                          String collegeKey, boolean mustChangePassword) {

    public enum Role { ADMIN, HOD, STUDENT, FACULTY }

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
