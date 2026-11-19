package com.studygenie.backend.service.study;

import com.studygenie.backend.adapter.inmemory.InMemoryCardScheduleStore;
import com.studygenie.backend.adapter.inmemory.InMemoryStudyKitStore;
import com.studygenie.backend.adapter.inmemory.InMemorySubmissionLog;
import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.dto.study.*;
import com.studygenie.backend.enums.ReviewRating;
import com.studygenie.backend.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class StudySessionServiceTest {

    private InMemoryStudyKitStore kitStore;
    private InMemoryCardScheduleStore scheduleStore;
    private InMemorySubmissionLog submissionLog;
    private StudyLogicProperties props;
    private FixedClock clock;
    private ApplicationEventPublisher publisher;
    private StudySessionService service;

    @BeforeEach
    void setUp() {
        props = new StudyLogicProperties();
        clock = new FixedClock(Instant.parse("2026-10-01T12:00:00Z"), ZoneId.of("UTC"));
        kitStore = new InMemoryStudyKitStore(props);
        scheduleStore = new InMemoryCardScheduleStore();
        submissionLog = new InMemorySubmissionLog(props, clock);
        publisher = mock(ApplicationEventPublisher.class);

        service = new StudySessionService(kitStore, scheduleStore, submissionLog, props, clock, publisher);
    }

    @Test
    void testNotYetDueCardsAreUnchangedAndNotCounted() {
        // Setup Kit
        String kitId = UUID.randomUUID().toString();
        StoredStudyKit kit = new StoredStudyKit(kitId, 1L, List.of(
            new StoredTopicKit("t1", List.of(new StoredFlashcard("c1", "Q", "A")), List.of())
        ));
        kitStore.save(kit);
        
        // Review once -> due tomorrow (interval 1)
        ReviewRequest req1 = new ReviewRequest(UUID.randomUUID(), List.of(new ReviewRequest.ReviewItem("c1", ReviewRating.GOOD)));
        ReviewResponse res1 = service.reviewCards(1L, kitId, req1);
        assertEquals(1, res1.counted());
        
        // Review again immediately (today) -> not due
        ReviewRequest req2 = new ReviewRequest(UUID.randomUUID(), List.of(new ReviewRequest.ReviewItem("c1", ReviewRating.EASY)));
        ReviewResponse res2 = service.reviewCards(1L, kitId, req2);
        assertEquals(0, res2.counted());
        assertEquals(1, res2.reviewed()); // it was processed but counted=false
        
        // Verify schedule is unchanged
        CardSchedule schedule = scheduleStore.findByUserIdAndKitId(1L, kitId).get(0);
        assertEquals(1, schedule.intervalDays());
        assertEquals(2.5, schedule.easeFactor(), 0.001);
    }

    @Test
    void testOwnership404() {
        String kitId = UUID.randomUUID().toString();
        StoredStudyKit kit = new StoredStudyKit(kitId, 2L, List.of()); // Belongs to User 2
        kitStore.save(kit);

        ReviewRequest req = new ReviewRequest(UUID.randomUUID(), List.of());
        assertThrows(ResourceNotFoundException.class, () -> service.reviewCards(1L, kitId, req));
    }

    @Test
    void testDuplicateCardIdsInReviewThrow400() {
        String kitId = UUID.randomUUID().toString();
        StoredStudyKit kit = new StoredStudyKit(kitId, 1L, List.of(
            new StoredTopicKit("t1", List.of(new StoredFlashcard("c1", "Q", "A")), List.of())
        ));
        kitStore.save(kit);

        ReviewRequest req = new ReviewRequest(UUID.randomUUID(), List.of(
            new ReviewRequest.ReviewItem("c1", ReviewRating.GOOD),
            new ReviewRequest.ReviewItem("c1", ReviewRating.EASY)
        ));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.reviewCards(1L, kitId, req));
        assertTrue(ex.getMessage().contains("Duplicate"));
    }

    @Test
    void testSubmitQuizWithMcqTrueFalseAndShortAnswer() {
        String kitId = UUID.randomUUID().toString();
        StoredQuizQuestion mcq = new StoredQuizQuestion("q1", "MCQ", "What is 2+2?", List.of("3", "4", "5"), 1, "4", "Math");
        StoredQuizQuestion tf = new StoredQuizQuestion("q2", "TRUE_FALSE", "Earth is round.", List.of("True", "False"), 0, "True", "Geography");
        StoredQuizQuestion sa = new StoredQuizQuestion("q3", "SHORT_ANSWER", "Capital of France?", List.of("Paris"), 0, "Paris", "Geography");

        StoredStudyKit kit = new StoredStudyKit(kitId, 1L, List.of(
            new StoredTopicKit("t1", List.of(), List.of(mcq, tf, sa))
        ));
        kitStore.save(kit);

        QuizSubmissionRequest req = new QuizSubmissionRequest(UUID.randomUUID(), List.of(
            new QuizSubmissionRequest.QuizAnswer("q1", 1),
            new QuizSubmissionRequest.QuizAnswer("q2", 0),
            new QuizSubmissionRequest.QuizAnswer("q3", null, "Paris")
        ));

        QuizSubmissionResponse res = service.submitQuiz(1L, kitId, req);
        assertEquals(3, res.score());
        assertEquals(3, res.total());
        assertEquals(100.0, res.percentage(), 0.01);
        assertTrue(res.passed());
    }

    // Fixed clock
    static class FixedClock extends Clock {
        private Instant instant;
        private final ZoneId zone;
        public FixedClock(Instant instant, ZoneId zone) { this.instant = instant; this.zone = zone; }
        public void setInstant(Instant instant) { this.instant = instant; }
        @Override public ZoneId getZone() { return zone; }
        @Override public Clock withZone(ZoneId zone) { return new FixedClock(instant, zone); }
        @Override public Instant instant() { return instant; }
    }
}
