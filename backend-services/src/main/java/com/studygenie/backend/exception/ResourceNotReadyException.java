package com.studygenie.backend.exception;
import org.springframework.http.HttpStatus;

public class ResourceNotReadyException extends ApiException {
    public ResourceNotReadyException(String message, String errorCode) {
        super(message, HttpStatus.CONFLICT, errorCode);
    }
}
