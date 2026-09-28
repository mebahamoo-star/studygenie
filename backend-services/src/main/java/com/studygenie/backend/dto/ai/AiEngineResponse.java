package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record AiEngineResponse<T>(
        boolean success,
        String message,
        T data,
        String errorCode,
        List<AiEngineErrorDetail> errors,
        String timestamp
) {}
