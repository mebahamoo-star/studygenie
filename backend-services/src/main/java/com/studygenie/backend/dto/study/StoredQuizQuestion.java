package com.studygenie.backend.dto.study;

import java.util.List;

public record StoredQuizQuestion(
        String questionId,
        String type,
        String question,
        List<String> options,
        int correctOptionIndex,
        String correctAnswerText,
        String explanation
) {
    public StoredQuizQuestion(String questionId, String type, String question, List<String> options, int correctOptionIndex, String explanation) {
        this(questionId, type, question, options, correctOptionIndex, null, explanation);
    }
}
