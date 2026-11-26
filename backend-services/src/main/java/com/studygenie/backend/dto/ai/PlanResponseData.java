package com.studygenie.backend.dto.ai;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlanResponseData(
        List<Task> tasks,
        List<SkippedTopic> skippedTopics,
        PlanSummary summary,
        LocalDate examDate,
        Double dailyHours,
        List<Integer> restWeekdays,
        Map<Integer, Double> weekdayHours
) {
    public PlanResponseData(List<Task> tasks, List<SkippedTopic> skippedTopics, PlanSummary summary) {
        this(tasks, skippedTopics, summary, null, null, null, null);
    }
}
