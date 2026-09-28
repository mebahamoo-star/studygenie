package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TopicItem(
        int orderIndex,
        String chapterTitle,
        double estimatedHours,
        int importance,
        List<String> subtopics
) {}
