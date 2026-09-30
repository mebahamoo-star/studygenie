package com.studygenie.backend.dto.syllabus;

public record TopicDto(
    String chapterTitle,
    Integer orderIndex,
    Double estimatedHours
) {}
