package com.studygenie.backend.dto.ai;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record QuizQuestion(
    String type,
    String question,
    List<String> options,
    int correctOptionIndex,
    String correctAnswerText,
    String explanation
) {
    public QuizQuestion(String type, String question, List<String> options, int correctOptionIndex, String explanation) {
        this(type, question, options, correctOptionIndex, null, explanation);
    }
}
