package com.studygenie.backend.dto.browse;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record JoinCourseRequest(
    @NotNull(message = "Exam date is required")
    LocalDate examDate,
    Double dailyHours,
    String mode
) {}
