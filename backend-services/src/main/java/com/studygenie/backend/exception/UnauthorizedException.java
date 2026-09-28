package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * UnauthorizedException exception.
 */
public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(message, HttpStatus.UNAUTHORIZED);
    }
}
