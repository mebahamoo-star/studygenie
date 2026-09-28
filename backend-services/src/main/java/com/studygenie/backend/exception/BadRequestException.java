package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * BadRequestException exception.
 */
public class BadRequestException extends ApiException {

    public BadRequestException(String message) {
        super(message, HttpStatus.BAD_REQUEST);
    }
}
