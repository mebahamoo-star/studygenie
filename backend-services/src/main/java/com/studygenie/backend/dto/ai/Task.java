package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record Task(
    Long id,
    LocalDate date,
    String topicRef,
    @JsonAlias({"topicTitle", "chapterTitle", "chapter_title", "title"})
    String topicTitle,
    String taskType,
    int minutes,
    @JsonAlias({"description", "action", "details"})
    String description,
    List<String> subtopics,
    @JsonAlias({"isCompleted", "is_completed", "completed"})
    Boolean isCompleted,
    @JsonAlias({"completedAt", "completed_at"})
    LocalDateTime completedAt,
    @JsonAlias({"xpAwarded", "xp_awarded"})
    Boolean xpAwarded
) {
    public Task(LocalDate date, String topicRef, String taskType, int minutes) {
        this(null, date, topicRef, "Topic " + topicRef, taskType, minutes, "Study Session", new ArrayList<>(), false, null, false);
    }

    public Task(LocalDate date, String topicRef, String topicTitle, String taskType, int minutes, String description, List<String> subtopics) {
        this(null, date, topicRef, topicTitle, taskType, minutes, description, subtopics, false, null, false);
    }
}
