package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratePlanRequest {
    @JsonAlias("startDate")
    @Builder.Default
    private LocalDate startDate = LocalDate.now();

    @JsonAlias("examDate")
    @Builder.Default
    private LocalDate examDate = LocalDate.now().plusWeeks(2);

    @Builder.Default
    private List<TopicPlanInput> topics = new ArrayList<>();

    @JsonAlias("dailyHours")
    @Builder.Default
    private double dailyHours = 2.0;

    @JsonAlias({"restWeekdays", "restDays", "rest_days"})
    @Builder.Default
    private List<Integer> restWeekdays = List.of(6);

    @Builder.Default
    private String mode = "NORMAL";

    @JsonAlias({"bufferDaysBeforeExam", "bufferDays", "buffer_days"})
    @Builder.Default
    private int bufferDaysBeforeExam = 1;

    @JsonAlias("reviewRatio")
    @Builder.Default
    private double reviewRatio = 0.15;

    // Record-style accessors for backward compatibility
    public LocalDate startDate() {
        return startDate != null ? startDate : LocalDate.now();
    }

    public LocalDate examDate() {
        return examDate != null ? examDate : LocalDate.now().plusWeeks(2);
    }

    public List<TopicPlanInput> topics() {
        return topics != null ? topics : new ArrayList<>();
    }

    public double dailyHours() {
        return dailyHours >= 0.5 ? dailyHours : 2.0;
    }

    public List<Integer> restWeekdays() {
        return restWeekdays != null ? restWeekdays : List.of(6);
    }

    public String mode() {
        return mode != null && !mode.isBlank() ? mode : "NORMAL";
    }

    public int bufferDaysBeforeExam() {
        return bufferDaysBeforeExam >= 0 ? bufferDaysBeforeExam : 1;
    }

    public double reviewRatio() {
        return (reviewRatio >= 0.0 && reviewRatio <= 0.4) ? reviewRatio : 0.15;
    }
}
