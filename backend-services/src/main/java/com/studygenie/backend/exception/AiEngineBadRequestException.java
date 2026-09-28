package com.studygenie.backend.exception;

import org.springframework.http.HttpStatus;

public class AiEngineBadRequestException extends AiEngineException {
    public AiEngineBadRequestException(String message) {
        super(message, HttpStatus.UNPROCESSABLE_ENTITY); // Mapping upstream 400/422 to 422 to avoid confusing with our own validation
    }
}
