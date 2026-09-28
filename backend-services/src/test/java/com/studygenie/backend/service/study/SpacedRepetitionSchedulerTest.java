package com.studygenie.backend.service.study;

import com.studygenie.backend.dto.study.CardSchedule;
import com.studygenie.backend.enums.ReviewRating;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SpacedRepetitionSchedulerTest {

    private final LocalDate today = LocalDate.of(2026, 1, 1);
    private final double minEf = 1.3;
    private final int maxInterval = 365;

    @Test
    void testAllGoodSequence() {
        // Initial EF 2.5
        CardSchedule card = CardSchedule.newCard("c1", 2.5, today);
        
        // Rep 0 -> GOOD (interval 1)
        card = SpacedRepetitionScheduler.review(card, ReviewRating.GOOD, today, minEf, maxInterval);
        assertEquals(1, card.intervalDays());
        assertEquals(1, card.repetitions());
        assertEquals(2.5, card.easeFactor(), 0.001);
        
        // Rep 1 -> GOOD (interval 6)
        card = SpacedRepetitionScheduler.review(card, ReviewRating.GOOD, today, minEf, maxInterval);
        assertEquals(6, card.intervalDays());
        assertEquals(2, card.repetitions());
        assertEquals(2.5, card.easeFactor(), 0.001);

        // Rep 2 -> GOOD (interval 6 * 2.5 = 15)
        card = SpacedRepetitionScheduler.review(card, ReviewRating.GOOD, today, minEf, maxInterval);
        assertEquals(15, card.intervalDays());
        assertEquals(3, card.repetitions());
        assertEquals(2.5, card.easeFactor(), 0.001);
        
        // Rep 3 -> GOOD (interval 15 * 2.5 = 37.5 -> 38)
        card = SpacedRepetitionScheduler.review(card, ReviewRating.GOOD, today, minEf, maxInterval);
        assertEquals(38, card.intervalDays());
        assertEquals(4, card.repetitions());
        assertEquals(2.5, card.easeFactor(), 0.001);
    }

    @Test
    void testAllEasySequence() {
        CardSchedule card = CardSchedule.newCard("c1", 2.5, today);
        
        // Rep 0 -> EASY (interval 1, EF increases by 0.1)
        card = SpacedRepetitionScheduler.review(card, ReviewRating.EASY, today, minEf, maxInterval);
        assertEquals(1, card.intervalDays());
        assertEquals(2.6, card.easeFactor(), 0.001);
        
        // Rep 1 -> EASY (interval 6, EF increases by 0.1)
        card = SpacedRepetitionScheduler.review(card, ReviewRating.EASY, today, minEf, maxInterval);
        assertEquals(6, card.intervalDays());
        assertEquals(2.7, card.easeFactor(), 0.001);

        // Rep 2 -> EASY (interval 6 * 2.7 = 16.2 -> 16, EF increases by 0.1)
        card = SpacedRepetitionScheduler.review(card, ReviewRating.EASY, today, minEf, maxInterval);
        assertEquals(16, card.intervalDays());
        assertEquals(2.8, card.easeFactor(), 0.001);
    }

    @Test
    void testHardLowersEfAndAgainResets() {
        CardSchedule card = CardSchedule.newCard("c1", 2.5, today);
        card = SpacedRepetitionScheduler.review(card, ReviewRating.GOOD, today, minEf, maxInterval);
        card = SpacedRepetitionScheduler.review(card, ReviewRating.GOOD, today, minEf, maxInterval);
        
        // HARD (drops EF by 0.14)
        card = SpacedRepetitionScheduler.review(card, ReviewRating.HARD, today, minEf, maxInterval);
        assertEquals(2.36, card.easeFactor(), 0.001);
        
        // AGAIN (resets reps and interval to 1, lapses + 1, EF unchanged)
        card = SpacedRepetitionScheduler.review(card, ReviewRating.AGAIN, today, minEf, maxInterval);
        assertEquals(1, card.intervalDays());
        assertEquals(0, card.repetitions());
        assertEquals(1, card.lapses());
        assertEquals(2.36, card.easeFactor(), 0.001);
    }
}
