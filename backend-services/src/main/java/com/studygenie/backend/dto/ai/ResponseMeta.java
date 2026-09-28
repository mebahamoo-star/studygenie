package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonProperty;

@com.fasterxml.jackson.databind.annotation.JsonNaming(com.fasterxml.jackson.databind.PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ResponseMeta(
        String model,
        String promptVersion,
        UsageMeta usage,
        int durationMs,
        String requestId
) {}
