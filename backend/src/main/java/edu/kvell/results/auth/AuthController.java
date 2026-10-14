package edu.kvell.results.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    AuthService.LoginResponse login(@RequestBody AuthService.LoginRequest request, HttpServletRequest http) {
        return auth.login(request, http.getRemoteAddr());
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(HttpServletRequest http) {
        String token = TokenAuthFilter.bearerToken(http);
        if (token != null) {
            auth.logout(token);
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    AuthService.UserView me() {
        return auth.me(CurrentUser.get());
    }

    /** Staff choose their own password (required at first sign-in for accounts created with a shared one). */
    @PostMapping("/change-password")
    AuthService.UserView changePassword(@RequestBody AuthService.ChangePasswordRequest request, HttpServletRequest http) {
        return auth.changePassword(CurrentUser.get(), request, TokenAuthFilter.bearerToken(http), http.getRemoteAddr());
    }
}
