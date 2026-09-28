package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

public class AiEngineTimeoutException extends AiEngineException {
    public AiEngineTimeoutException(String message) {
        super(message, HttpStatus.GATEWAY_TIMEOUT);
    }
}
