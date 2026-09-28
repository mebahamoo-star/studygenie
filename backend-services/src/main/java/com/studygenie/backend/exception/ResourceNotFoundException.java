package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * ResourceNotFoundException exception.
 */
public class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND);
    }
}
