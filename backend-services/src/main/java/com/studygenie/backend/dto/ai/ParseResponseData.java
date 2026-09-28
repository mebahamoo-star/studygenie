package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ParseResponseData(
        String courseTitle,
        String language,
        List<TopicItem> topics,
        double totalEstimatedHours,
        List<String> warnings,
        String extractionMethod,
        int pages,
        int charsExtracted,
        String inputSha256,
        ResponseMeta meta
) {}
