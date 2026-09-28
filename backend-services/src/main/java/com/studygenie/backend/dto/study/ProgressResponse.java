package com.studygenie.backend.dto.study;

import java.time.LocalDate;

public record ProgressResponse(
        int totalCards,
        int newCards,
        int learningCards,
        int matureCards,
        int dueToday,
        double averageEaseFactor,
        LocalDate nextDueDate
) {}
