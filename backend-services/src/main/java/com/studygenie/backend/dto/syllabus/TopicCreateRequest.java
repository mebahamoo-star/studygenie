package com.studygenie.backend.dto.syllabus;

import jakarta.validation.constraints.NotBlank;

public record TopicCreateRequest(
    @NotBlank String chapterTitle,
    Double estimatedHours
) {}
