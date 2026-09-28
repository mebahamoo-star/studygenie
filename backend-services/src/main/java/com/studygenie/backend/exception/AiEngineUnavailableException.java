package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

public class AiEngineUnavailableException extends AiEngineException {
    public AiEngineUnavailableException(String message) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
