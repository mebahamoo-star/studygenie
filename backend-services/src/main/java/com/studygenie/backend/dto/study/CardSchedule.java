package com.studygenie.backend.dto.study;

import java.time.LocalDate;

public record CardSchedule(
        String cardId,
        double easeFactor,
        int intervalDays,
        int repetitions,
        int lapses,
        LocalDate dueDate,
        LocalDate lastReviewedDate
) {
    public static CardSchedule newCard(String cardId, double initialEaseFactor, LocalDate today) {
        return new CardSchedule(cardId, initialEaseFactor, 0, 0, 0, today, null);
    }

    public boolean isDue(LocalDate today) {
        return dueDate == null || !dueDate.isAfter(today);
    }
}
