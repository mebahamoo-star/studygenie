package com.studygenie.backend.dto.browse;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CourseCreateRequest(
    @NotBlank(message = "Course name is required")
    @Size(max = 150, message = "Course name must not exceed 150 characters")
    String name
) {}
