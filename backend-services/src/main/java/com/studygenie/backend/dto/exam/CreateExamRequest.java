package com.studygenie.backend.dto.exam;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreateExamRequest(
    @NotBlank(message = "Course is required")
    String course,

    @NotBlank(message = "Exam type is required")
    String type,

    @NotNull(message = "Exam date is required")
    LocalDate date,

    String professor
) {}
