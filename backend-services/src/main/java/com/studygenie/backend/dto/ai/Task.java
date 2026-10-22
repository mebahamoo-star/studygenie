package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record Task(
    LocalDate date,
    String topicRef,
    @JsonAlias({"topicTitle", "chapterTitle", "chapter_title", "title"})
    String topicTitle,
    String taskType,
    int minutes,
    @JsonAlias({"description", "action", "details"})
    String description,
    List<String> subtopics
) {
    public Task(LocalDate date, String topicRef, String taskType, int minutes) {
        this(date, topicRef, "Topic " + topicRef, taskType, minutes, "Study Session", new ArrayList<>());
    }
}
