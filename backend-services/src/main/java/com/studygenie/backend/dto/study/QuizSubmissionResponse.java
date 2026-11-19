package com.studygenie.backend.dto.study;

import java.util.List;

public record QuizSubmissionResponse(
        int score,
        int total,
        double percentage,
        boolean passed,
        boolean xpEligible,
        List<QuestionResult> results
) {
    public record QuestionResult(
            String questionId,
            boolean correct,
            Integer correctOptionIndex,
            String correctAnswerText,
            String explanation
    ) {
        public QuestionResult(String questionId, boolean correct, int correctOptionIndex, String explanation) {
            this(questionId, correct, correctOptionIndex, null, explanation);
        }
    }
}
