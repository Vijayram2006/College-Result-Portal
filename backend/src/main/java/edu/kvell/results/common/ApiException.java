package edu.kvell.results.common;

import org.springframework.http.HttpStatus;

/** An error whose message is safe to show to the user. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    /** Extra fields for the client (e.g. otpRequired, captchaRequired), added next to "error". */
    private final java.util.Map<String, Object> details;

    public ApiException(HttpStatus status, String message) {
        this(status, message, java.util.Map.of());
    }

    public ApiException(HttpStatus status, String message, java.util.Map<String, Object> details) {
        super(message);
        this.status = status;
        this.details = details;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public java.util.Map<String, Object> getDetails() {
        return details;
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message);
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, message);
    }
}
