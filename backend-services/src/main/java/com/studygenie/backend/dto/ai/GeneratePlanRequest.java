package com.studygenie.backend.dto.ai;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.time.LocalDate;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record GeneratePlanRequest(LocalDate startDate, LocalDate examDate, List<TopicPlanInput> topics, double dailyHours, List<Integer> restWeekdays, String mode, int bufferDaysBeforeExam, double reviewRatio) {}
