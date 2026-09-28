package com.studygenie.backend.dto.ai;

@com.fasterxml.jackson.databind.annotation.JsonNaming(com.fasterxml.jackson.databind.PropertyNamingStrategies.SnakeCaseStrategy.class)
public record UsageMeta(
        int promptTokens,
        int outputTokens
) {}
