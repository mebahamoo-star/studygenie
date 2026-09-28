package com.studygenie.backend.dto.study;

import java.util.List;

public record StoredQuizQuestion(
        String questionId,
        String type,
        String question,
        List<String> options,
        int correctOptionIndex,
        String explanation
) {}
