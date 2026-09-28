package com.studygenie.backend.service.gamification;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class LevelCalculatorTest {
    private final LevelCalculator calculator = new LevelCalculator();

    @Test
    void testBoundaryLevels() {
        assertEquals(1, calculator.calculateLevel(0));
        assertEquals(1, calculator.calculateLevel(99));
        assertEquals(2, calculator.calculateLevel(100));
        assertEquals(2, calculator.calculateLevel(299));
        assertEquals(3, calculator.calculateLevel(300));
        assertEquals(3, calculator.calculateLevel(599));
        assertEquals(4, calculator.calculateLevel(600));
    }
}
