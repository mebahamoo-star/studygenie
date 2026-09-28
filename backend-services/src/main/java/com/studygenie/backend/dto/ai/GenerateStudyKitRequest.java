package com.studygenie.backend.dto.ai;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record GenerateStudyKitRequest(String courseName, String language, List<TopicInput> topics, int flashcardsPerTopic, int questionsPerTopic) {}
