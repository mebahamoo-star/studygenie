package com.studygenie.backend.dto.browse;

import com.fasterxml.jackson.annotation.JsonAlias;
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
    @JsonAlias({"selectedTopicIds", "selected_topic_ids"})
    List<Long> selectedTopicIds,
    @JsonProperty("rest_weekdays")
    @JsonAlias({"restWeekdays", "restDays", "rest_days"})
    List<Integer> restWeekdays
) {
    public JoinCourseRequest(LocalDate examDate, Double dailyHours, String mode) {
        this(examDate, dailyHours, mode, null, null);
    }

    public JoinCourseRequest(LocalDate examDate, Double dailyHours, String mode, List<Long> selectedTopicIds) {
        this(examDate, dailyHours, mode, selectedTopicIds, null);
    }
}
