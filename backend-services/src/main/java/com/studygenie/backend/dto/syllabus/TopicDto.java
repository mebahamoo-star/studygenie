package com.studygenie.backend.dto.syllabus;

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
}
