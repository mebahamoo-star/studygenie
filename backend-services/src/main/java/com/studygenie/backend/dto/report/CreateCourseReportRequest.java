package com.studygenie.backend.dto.report;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCourseReportRequest(
    @JsonProperty("course_id")
    Long courseId,

    @NotBlank(message = "Course name is required")
    @Size(max = 150)
    @JsonProperty("course_name")
    String courseName,

    @NotBlank(message = "Reason is required")
    @Size(max = 100)
    @JsonProperty("reason")
    String reason,

    @Size(max = 2000)
    @JsonProperty("details")
    String details,

    @Size(max = 150)
    @JsonProperty("reported_by")
    String reportedBy
) {}
