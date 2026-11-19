package com.studygenie.backend.dto.syllabus;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TopicDto(
    Long id,
    String chapterTitle,
    Integer orderIndex,
    Double estimatedHours,
    String contentExcerpt
) {
    public TopicDto(Long id, String chapterTitle, Integer orderIndex, Double estimatedHours) {
        this(id, chapterTitle, orderIndex, estimatedHours, null);
    }

    @JsonProperty("title")
    public String getTitle() {
        return chapterTitle;
    }

    @JsonProperty("weekNumber")
    public Integer getWeekNumber() {
        return orderIndex;
    }

    @JsonProperty("name")
    public String getName() {
        return chapterTitle;
    }

    @JsonProperty("title")
    public String title() {
        return chapterTitle;
    }

    @JsonProperty("weekNumber")
    public Integer weekNumber() {
        return orderIndex;
    }
}
