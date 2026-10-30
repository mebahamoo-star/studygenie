package com.studygenie.backend.dto.browse;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record JoinCourseRequest(
    @NotNull(message = "Exam date is required")
    LocalDate examDate,
    Double dailyHours,
    String mode,
    @JsonProperty("selected_topic_ids")
    List<Long> selectedTopicIds
) {
    public JoinCourseRequest(LocalDate examDate, Double dailyHours, String mode) {
        this(examDate, dailyHours, mode, null);
    }
}
