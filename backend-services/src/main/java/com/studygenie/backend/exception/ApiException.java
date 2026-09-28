package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Base abstract exception for API errors.
 */
public abstract class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
