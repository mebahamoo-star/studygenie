package com.studygenie.backend.dto.ai;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlanSummary(String mode, int studyDays, int capacityMinutes, int plannedMinutes, int plannedTopics, int skippedCount, boolean feasible, List<String> warnings) {}
