package com.studygenie.backend.dto.ai;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record PlanResponseData(List<Task> tasks, List<SkippedTopic> skippedTopics, PlanSummary summary) {}
