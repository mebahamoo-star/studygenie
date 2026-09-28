package com.studygenie.backend.service.study;

import com.studygenie.backend.adapter.inmemory.InMemoryCardScheduleStore;
import com.studygenie.backend.adapter.inmemory.InMemoryStudyKitStore;
import com.studygenie.backend.adapter.inmemory.InMemorySubmissionLog;
import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.dto.study.*;
import com.studygenie.backend.enums.ReviewRating;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class StudySessionConcurrencyTest {

    private InMemoryStudyKitStore kitStore;
    private InMemoryCardScheduleStore scheduleStore;
    private InMemorySubmissionLog submissionLog;
    private StudyLogicProperties props;
    private StudySessionService service;

    @BeforeEach
    void setUp() {
        props = new StudyLogicProperties();
        Clock clock = Clock.fixed(Instant.parse("2026-10-01T12:00:00Z"), ZoneId.of("UTC"));
        kitStore = new InMemoryStudyKitStore(props);
        scheduleStore = new InMemoryCardScheduleStore();
        submissionLog = new InMemorySubmissionLog(props, clock);
        ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);

        service = new StudySessionService(kitStore, scheduleStore, submissionLog, props, clock, publisher);
    }

    @Test
    void testConcurrentReviewsIsolateProperly() throws InterruptedException {
        String kitId = UUID.randomUUID().toString();
        StoredStudyKit kit = new StoredStudyKit(kitId, 1L, List.of(
            new StoredTopicKit("t1", List.of(new StoredFlashcard("c1", "Q", "A")), List.of())
        ));
        kitStore.save(kit);

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        
        // They all submit a DIFFERENT submissionId for the SAME card simultaneously.
        // Due to "not yet due" logic, only the FIRST one to acquire the lock will see it as due.
        // The others will see it as not due and count=false.
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                ReviewRequest req = new ReviewRequest(UUID.randomUUID(), List.of(new ReviewRequest.ReviewItem("c1", ReviewRating.GOOD)));
                service.reviewCards(1L, kitId, req);
                latch.countDown();
            });
        }
        latch.await();

        List<CardSchedule> schedules = scheduleStore.findByUserIdAndKitId(1L, kitId);
        assertEquals(1, schedules.size());
        
        // It should only have been updated ONCE because subsequent threads see it as not due!
        assertEquals(1, schedules.get(0).repetitions());
    }
}
