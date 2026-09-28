package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * DuplicateResourceException exception.
 */
public class DuplicateResourceException extends ApiException {

    public DuplicateResourceException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
}
