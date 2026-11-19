package com.studygenie.backend.dto.admin;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminUpdateCourseRequest(
        @Size(max = 150)
        String name,

        Long collegeId,

        @Size(max = 20)
        String status,

        Boolean verified,

        Boolean locked
) {
    public record MergeRequest(@NotNull Long targetCourseId) {}

    public record UpdateTopicRequest(
            @Size(max = 250)
            String chapterTitle,
            Double estimatedHours,
            Integer orderIndex
    ) {}
}
