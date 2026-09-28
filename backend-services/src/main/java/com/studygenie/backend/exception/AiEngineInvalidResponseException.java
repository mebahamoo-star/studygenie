package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

public class AiEngineInvalidResponseException extends AiEngineException {
    public AiEngineInvalidResponseException(String message) {
        super(message, HttpStatus.BAD_GATEWAY);
    }
}
