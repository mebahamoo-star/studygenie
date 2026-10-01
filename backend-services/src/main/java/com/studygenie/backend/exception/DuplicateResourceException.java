package com.studygenie.backend.exception;
import org.springframework.http.HttpStatus;

public class DuplicateResourceException extends ApiException {
    public DuplicateResourceException(String message) {
        super(message, HttpStatus.CONFLICT);
    }
    public DuplicateResourceException(String message, String errorCode) {
        super(message, HttpStatus.CONFLICT, errorCode);
    }
}
