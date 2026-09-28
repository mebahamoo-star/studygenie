package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

public abstract class AiEngineException extends ApiException {
    public AiEngineException(String message, HttpStatus status) {
        super(message, status);
    }
}
