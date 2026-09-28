package com.studygenie.backend.service.study;

import com.studygenie.backend.adapter.inmemory.InMemoryCardScheduleStore;
import com.studygenie.backend.adapter.inmemory.InMemoryStudyKitStore;
import com.studygenie.backend.adapter.inmemory.InMemorySubmissionLog;
import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.dto.study.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StudySessionQuizTest {

    private InMemoryStudyKitStore kitStore;
    private InMemorySubmissionLog submissionLog;
    private StudyLogicProperties props;
    private ApplicationEventPublisher publisher;
    private StudySessionService service;

    @BeforeEach
    void setUp() {
        props = new StudyLogicProperties();
        Clock clock = Clock.fixed(Instant.parse("2026-10-01T12:00:00Z"), ZoneId.of("UTC"));
        kitStore = new InMemoryStudyKitStore(props);
        submissionLog = new InMemorySubmissionLog(props, clock);
        publisher = mock(ApplicationEventPublisher.class);

        service = new StudySessionService(kitStore, new InMemoryCardScheduleStore(), submissionLog, props, clock, publisher);
    }

    @Test
    void testQuizIdempotencyAndXpAbuse() {
        String kitId = UUID.randomUUID().toString();
        StoredStudyKit kit = new StoredStudyKit(kitId, 1L, List.of(
            new StoredTopicKit("t1", List.of(), List.of(
                new StoredQuizQuestion("q1", "MCQ", "Q1", List.of("A", "B"), 0, ""),
                new StoredQuizQuestion("q2", "MCQ", "Q2", List.of("C", "D"), 1, "")
            ))
        ));
        kitStore.save(kit);

        UUID subId1 = UUID.randomUUID();
        QuizSubmissionRequest req1 = new QuizSubmissionRequest(subId1, List.of(
            new QuizSubmissionRequest.QuizAnswer("q1", 0),
            new QuizSubmissionRequest.QuizAnswer("q2", 1) // 100% correct
        ));

        QuizSubmissionResponse res1 = service.submitQuiz(1L, kitId, req1);
        assertTrue(res1.passed());
        assertTrue(res1.xpEligible());
        verify(publisher, times(1)).publishEvent(any(Object.class)); // Triggered event once

        // Same submission ID -> Idempotent cache return
        QuizSubmissionResponse res1_duplicate = service.submitQuiz(1L, kitId, req1);
        assertTrue(res1_duplicate.xpEligible());
        verify(publisher, times(1)).publishEvent(any(Object.class)); // STILL ONCE!

        // Different submission ID, same answers -> Not xp eligible (Retake abuse prevention)
        UUID subId2 = UUID.randomUUID();
        QuizSubmissionRequest req2 = new QuizSubmissionRequest(subId2, List.of(
            new QuizSubmissionRequest.QuizAnswer("q1", 0),
            new QuizSubmissionRequest.QuizAnswer("q2", 1)
        ));
        QuizSubmissionResponse res2 = service.submitQuiz(1L, kitId, req2);
        assertTrue(res2.passed());
        assertFalse(res2.xpEligible()); // Should be false!
        verify(publisher, times(1)).publishEvent(any(Object.class)); // STILL ONCE!
    }

    @Test
    void testQuizBoundaryAndValidation() {
        String kitId = UUID.randomUUID().toString();
        StoredStudyKit kit = new StoredStudyKit(kitId, 1L, List.of(
            new StoredTopicKit("t1", List.of(), List.of(
                new StoredQuizQuestion("q1", "MCQ", "Q1", List.of("A", "B"), 0, ""),
                new StoredQuizQuestion("q2", "MCQ", "Q2", List.of("C", "D"), 1, ""),
                new StoredQuizQuestion("q3", "MCQ", "Q3", List.of("E", "F"), 0, "")
            ))
        ));
        kitStore.save(kit);
        props.setQuizPassThresholdPercent(66); // 2/3 is 66.6%, passes.

        // Submit 2 correct, 1 unanswered.
        QuizSubmissionRequest req1 = new QuizSubmissionRequest(UUID.randomUUID(), List.of(
            new QuizSubmissionRequest.QuizAnswer("q1", 0),
            new QuizSubmissionRequest.QuizAnswer("q2", 1)
            // q3 unanswered
        ));
        QuizSubmissionResponse res1 = service.submitQuiz(1L, kitId, req1);
        assertEquals(2, res1.score());
        assertEquals(3, res1.total());
        assertTrue(res1.passed());

        // Duplicate answer throws 400
        QuizSubmissionRequest req2 = new QuizSubmissionRequest(UUID.randomUUID(), List.of(
            new QuizSubmissionRequest.QuizAnswer("q1", 0),
            new QuizSubmissionRequest.QuizAnswer("q1", 1)
        ));
        assertThrows(IllegalArgumentException.class, () -> service.submitQuiz(1L, kitId, req2));

        // Unknown question throws 400
        QuizSubmissionRequest req3 = new QuizSubmissionRequest(UUID.randomUUID(), List.of(
            new QuizSubmissionRequest.QuizAnswer("unknown", 0)
        ));
        assertThrows(IllegalArgumentException.class, () -> service.submitQuiz(1L, kitId, req3));
    }
}
