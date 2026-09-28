package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * ForbiddenException exception.
 */
public class ForbiddenException extends ApiException {

    public ForbiddenException(String message) {
        super(message, HttpStatus.FORBIDDEN);
    }
}
