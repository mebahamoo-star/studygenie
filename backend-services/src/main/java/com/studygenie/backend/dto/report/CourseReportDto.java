package com.studygenie.backend.dto.report;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

public record CourseReportDto(
    @JsonProperty("id") Long id,
    @JsonProperty("course_id") Long courseId,
    @JsonProperty("course_name") String courseName,
    @JsonProperty("reported_by") String reportedBy,
    @JsonProperty("reason") String reason,
    @JsonProperty("details") String details,
    @JsonProperty("status") String status,
    @JsonProperty("created_at") LocalDateTime createdAt
) {}
