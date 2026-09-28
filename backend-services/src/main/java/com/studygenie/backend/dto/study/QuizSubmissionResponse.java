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
            int correctOptionIndex,
            String explanation
    ) {}
}
