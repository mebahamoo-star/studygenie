package com.studygenie.backend.service.study;

import com.studygenie.backend.dto.study.CardSchedule;
import com.studygenie.backend.enums.ReviewRating;

import java.time.LocalDate;

/**
 * Pure functions for Spaced Repetition (SM-2 based) logic.
 * No Spring dependencies.
 */
public class SpacedRepetitionScheduler {

    /**
     * Applies the SM-2 algorithm to update a card's schedule.
     * 
     * Algorithm details:
     * - New card: EF=2.5, repetitions=0, interval=0.
     * - If q >= 3 (HARD/GOOD/EASY):
     *   - repetitions == 0 -> interval = 1
     *   - repetitions == 1 -> interval = 6
     *   - otherwise -> interval = round(previousInterval * easeFactor) [half up]
     *   - repetitions += 1
     *   - EF = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), min 1.3
     * - If q < 3 (AGAIN):
     *   - repetitions = 0, interval = 1, lapses += 1, EF unchanged.
     * - dueDate = today + intervalDays
     */
    public static CardSchedule review(CardSchedule current, ReviewRating rating, LocalDate today, double minEaseFactor, int maxIntervalDays) {
        int q = rating.getQ();
        int repetitions = current.repetitions();
        int interval = current.intervalDays();
        double ef = current.easeFactor();
        int lapses = current.lapses();

        if (q >= 3) {
            if (repetitions == 0) {
                interval = 1;
            } else if (repetitions == 1) {
                interval = 6;
            } else {
                interval = (int) Math.round(interval * ef);
            }
            repetitions++;
            
            ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
            if (ef < minEaseFactor) {
                ef = minEaseFactor;
            }
        } else {
            repetitions = 0;
            interval = 1;
            lapses++;
        }

        // Round EF to 2 decimal places
        ef = Math.round(ef * 100.0) / 100.0;
        
        // Cap interval
        interval = Math.min(interval, maxIntervalDays);

        return new CardSchedule(
                current.cardId(),
                ef,
                interval,
                repetitions,
                lapses,
                today.plusDays(interval),
                today
        );
    }
}
