package com.studygenie.backend.service.gamification;

import com.studygenie.backend.adapter.inmemory.InMemoryGamificationStore;
import com.studygenie.backend.config.GamificationProperties;
import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.event.UserActionCompletedEvent;
import com.studygenie.backend.service.gamification.badge.BadgeRule;
import com.studygenie.backend.service.gamification.badge.FirstStepBadgeRule;
import com.studygenie.backend.service.gamification.badge.StreakBadgeRule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class GamificationServiceTest {

    private InMemoryGamificationStore store;
    private GamificationService service;
    private GamificationProperties props;
    private FixedClock clock;

    @BeforeEach
    void setUp() {
        store = new InMemoryGamificationStore();
        props = new GamificationProperties();
        props.setXpPerAction(Map.of(ActionType.QUIZ_PASSED.name(), 50));
        props.setDailyCapPerAction(Map.of(ActionType.QUIZ_PASSED.name(), 100));
        props.setStreakBadgeThresholdDays(3);

        clock = new FixedClock(Instant.parse("2026-10-01T12:00:00Z"), ZoneId.of("UTC"));
        List<BadgeRule> rules = List.of(new FirstStepBadgeRule(), new StreakBadgeRule(props));
        
        service = new GamificationService(store, props, new LevelCalculator(), rules, clock);
    }

    @Test
    void testSameDayRepeatedEventsDoNotIncreaseStreak() {
        service.handleUserAction(UserActionCompletedEvent.create(1L, "Test", ActionType.QUIZ_PASSED, 1));
        GamificationProfile p1 = store.getProfile(1L);
        assertEquals(1, p1.currentStreakDays());

        service.handleUserAction(UserActionCompletedEvent.create(1L, "Test", ActionType.QUIZ_PASSED, 1));
        GamificationProfile p2 = store.getProfile(1L);
        assertEquals(1, p2.currentStreakDays());
        assertEquals(100, p2.currentXp());
    }

    @Test
    void testMidnightCrossingStreakIncreaseAndGapReset() {
        // Day 1
        service.handleUserAction(UserActionCompletedEvent.create(1L, "Test", ActionType.QUIZ_PASSED, 1));
        
        // Day 2 (Midnight crossed)
        clock.setInstant(Instant.parse("2026-10-02T12:00:00Z"));
        service.handleUserAction(UserActionCompletedEvent.create(1L, "Test", ActionType.QUIZ_PASSED, 1));
        GamificationProfile p = store.getProfile(1L);
        assertEquals(2, p.currentStreakDays());

        // Gap of > 1 day resets streak
        clock.setInstant(Instant.parse("2026-10-04T12:00:00Z"));
        service.handleUserAction(UserActionCompletedEvent.create(1L, "Test", ActionType.QUIZ_PASSED, 1));
        GamificationProfile p2 = store.getProfile(1L);
        assertEquals(1, p2.currentStreakDays());
        assertEquals(2, p2.longestStreakDays());
    }

    @Test
    void testBadgeAwardedExactlyOnce() {
        service.handleUserAction(UserActionCompletedEvent.create(1L, "Test", ActionType.QUIZ_PASSED, 1));
        GamificationProfile p1 = store.getProfile(1L);
        assertEquals(1, p1.unlockedBadges().size()); // First Step
        assertEquals(FirstStepBadgeRule.ID, p1.unlockedBadges().get(0).id());

        // Action 2 should not give badge again
        service.handleUserAction(UserActionCompletedEvent.create(1L, "Test", ActionType.QUIZ_PASSED, 1));
        GamificationProfile p2 = store.getProfile(1L);
        assertEquals(1, p2.unlockedBadges().size());
    }

    @Test
    void testDailyCap() {
        // Limit is 100
        service.handleUserAction(UserActionCompletedEvent.create(1L, "Test", ActionType.QUIZ_PASSED, 2)); // 100 XP
        service.handleUserAction(UserActionCompletedEvent.create(1L, "Test", ActionType.QUIZ_PASSED, 1)); // Should be capped
        assertEquals(100, store.getProfile(1L).currentXp());
        
        // Next day should allow more
        clock.setInstant(Instant.parse("2026-10-02T12:00:00Z"));
        service.handleUserAction(UserActionCompletedEvent.create(1L, "Test", ActionType.QUIZ_PASSED, 1));
        assertEquals(150, store.getProfile(1L).currentXp());
    }

    @Test
    void testConcurrentEvents() throws InterruptedException {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        // Cap is 100, each is 50. Only 2 should add XP. But let's temporarily remove cap for test
        props.setDailyCapPerAction(Map.of(ActionType.QUIZ_PASSED.name(), 5000));
        
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                service.handleUserAction(UserActionCompletedEvent.create(2L, "Thread User", ActionType.QUIZ_PASSED, 1));
                latch.countDown();
            });
        }
        latch.await();
        assertEquals(500, store.getProfile(2L).currentXp());
    }

    // Fixed clock for testing
    static class FixedClock extends Clock {
        private Instant instant;
        private final ZoneId zone;

        public FixedClock(Instant instant, ZoneId zone) {
            this.instant = instant;
            this.zone = zone;
        }

        public void setInstant(Instant instant) {
            this.instant = instant;
        }

        @Override
        public ZoneId getZone() { return zone; }
        @Override
        public Clock withZone(ZoneId zone) { return new FixedClock(instant, zone); }
        @Override
        public Instant instant() { return instant; }
    }
}
