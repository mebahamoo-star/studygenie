package com.studygenie.backend.service.gamification;

import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.event.UserActionCompletedEvent;
import com.studygenie.backend.service.port.GamificationStore;
import com.studygenie.backend.adapter.jpa.JpaGamificationStore;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.entity.Student;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.ApplicationContext;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("dev")
public class GamificationIntegrationTest {

    @Autowired
    private ApplicationEventPublisher publisher;

    @Autowired
    private GamificationStore store;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private ApplicationContext context;

    @Test
    void testEventPublishingUpdatesStore() {
        Student s = new Student();
        s.setFullName("Integrator");
        s.setEmail("integrator" + System.currentTimeMillis() + "@test.com");
        s.setPassword("hash");
        s = studentRepository.save(s);

        publisher.publishEvent(UserActionCompletedEvent.create(s.getId(), "Integrator", ActionType.SYLLABUS_UPLOADED, 1));
        
        GamificationProfile profile = store.getProfile(s.getId());
        assertEquals(s.getId(), profile.userId());
        assertEquals("Integrator", profile.displayName());
        assertEquals(100, profile.currentXp());
    }

    @Test
    void testForcedConcurrencyLostUpdate() throws InterruptedException {
        Student s = new Student();
        s.setFullName("Concurrency Tester");
        s.setEmail("concurrency" + System.currentTimeMillis() + "@test.com");
        s.setPassword("hash");
        s = studentRepository.save(s);
        Long userId = s.getId();

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger overlapCounter = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    GamificationService.currentEventId.set("event-" + System.nanoTime());
                    store.update(userId, profile -> {
                        // Sleep to force overlap between reads
                        try {
                            overlapCounter.incrementAndGet();
                            Thread.sleep(100);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        }
                        return new GamificationProfile(
                                profile.userId(), profile.displayName(),
                                profile.currentXp() + 10, profile.currentLevel(),
                                profile.currentStreakDays(), profile.longestStreakDays(), profile.lastActiveDate(),
                                profile.unlockedBadges(), profile.dailyXp(), profile.processedEventIds());
                    });
                } finally {
                    GamificationService.currentEventId.remove();
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();

        GamificationProfile finalProfile = store.getProfile(userId);
        assertEquals(20, finalProfile.currentXp(), "Both threads should successfully add 10 points without lost updates");
        assertTrue(overlapCounter.get() >= 2, "Threads should have overlapped");
    }

    @Test
    void testRestartSimulationIdempotency() {
        Student s = new Student();
        s.setFullName("Restart Tester");
        s.setEmail("restart" + System.currentTimeMillis() + "@test.com");
        s.setPassword("hash");
        s = studentRepository.save(s);
        Long userId = s.getId();

        // 1. Initial update
        GamificationService.currentEventId.set("unique-event-1");
        store.update(userId, profile -> new GamificationProfile(
                profile.userId(), profile.displayName(), profile.currentXp() + 50,
                profile.currentLevel(), profile.currentStreakDays(), profile.longestStreakDays(),
                profile.lastActiveDate(), profile.unlockedBadges(), java.util.Map.of(ActionType.QUIZ_PASSED, 50),
                profile.processedEventIds()
        ));
        GamificationService.currentEventId.remove();

        // 2. Simulate restart by getting a fresh instance from the context that uses real repos
        JpaGamificationStore freshStore = new JpaGamificationStore(
                context.getBean(StudentRepository.class),
                context.getBean(com.studygenie.backend.repository.PointsLedgerRepository.class),
                context.getBean(com.studygenie.backend.repository.GamificationEventLogRepository.class),
                context.getBean(com.studygenie.backend.repository.StudentBadgeRepository.class),
                context.getBean(com.studygenie.backend.service.gamification.LevelCalculator.class),
                context.getBean(java.time.Clock.class),
                context.getBean(jakarta.persistence.EntityManager.class)
        );

        // Verify Daily XP recovered
        org.springframework.transaction.support.TransactionTemplate txTemplate = new org.springframework.transaction.support.TransactionTemplate(context.getBean(org.springframework.transaction.PlatformTransactionManager.class));
        GamificationProfile recovered = txTemplate.execute(status -> freshStore.getProfile(userId));
        assertEquals(50, recovered.dailyXp().getOrDefault(ActionType.QUIZ_PASSED, 0));

        // 3. Replay same event on fresh store (should be ignored)
        GamificationService.currentEventId.set("unique-event-1");
        txTemplate.execute(status -> freshStore.update(userId, profile -> new GamificationProfile(
                profile.userId(), profile.displayName(), profile.currentXp() + 50,
                profile.currentLevel(), profile.currentStreakDays(), profile.longestStreakDays(),
                profile.lastActiveDate(), profile.unlockedBadges(), profile.dailyXp(), profile.processedEventIds()
        )));
        GamificationService.currentEventId.remove();

        GamificationProfile finalProfile = txTemplate.execute(status -> freshStore.getProfile(userId));
        assertEquals(50, finalProfile.currentXp(), "Idempotency should reject duplicate event even after restart");
    }
}
