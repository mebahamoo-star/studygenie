package com.studygenie.backend.dto.study;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record QuizSubmissionRequest(
        @NotNull UUID submissionId,
        @NotNull List<QuizAnswer> answers
) {
    public record QuizAnswer(
            @NotNull String questionId,
            @NotNull Integer selectedOptionIndex
    ) {}
}
