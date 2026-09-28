package com.studygenie.backend.service.study;

import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.dto.study.*;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.event.UserActionCompletedEvent;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.service.port.CardScheduleStore;
import com.studygenie.backend.service.port.StudyKitStore;
import com.studygenie.backend.service.port.SubmissionLog;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
public class StudySessionService {

    private final StudyKitStore kitStore;
    private final CardScheduleStore scheduleStore;
    private final SubmissionLog submissionLog;
    private final StudyLogicProperties properties;
    private final Clock clock;
    private final ApplicationEventPublisher publisher;

    public StudySessionService(StudyKitStore kitStore, CardScheduleStore scheduleStore, SubmissionLog submissionLog,
                               StudyLogicProperties properties, Clock clock, ApplicationEventPublisher publisher) {
        this.kitStore = kitStore;
        this.scheduleStore = scheduleStore;
        this.submissionLog = submissionLog;
        this.properties = properties;
        this.clock = clock;
        this.publisher = publisher;
    }

    public ReviewResponse reviewCards(Long userId, String kitId, ReviewRequest request) {
        int payloadHash = request.hashCode();
        String submissionIdStr = request.submissionId().toString();

        SubmissionLog.SubmissionRecord record = submissionLog.get(userId, submissionIdStr);
        if (record != null) {
            if (record.payloadHash() != payloadHash) {
                throw new IllegalStateException("CONFLICT");
            }
            return (ReviewResponse) record.response();
        }

        StoredStudyKit kit = kitStore.findById(kitId)
                .filter(k -> k.ownerId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));

        Set<String> validCardIds = new HashSet<>();
        for (StoredTopicKit t : kit.topics()) {
            for (StoredFlashcard f : t.flashcards()) {
                validCardIds.add(f.cardId());
            }
        }

        Set<String> seenCards = new HashSet<>();
        LocalDate today = LocalDate.now(clock);

        int reviewed = 0;
        int counted = 0;
        int again = 0, hard = 0, good = 0, easy = 0;
        List<CardSchedule> updatedSchedules = new ArrayList<>();

        for (ReviewRequest.ReviewItem item : request.items()) {
            if (!validCardIds.contains(item.cardId())) {
                throw new IllegalArgumentException("Card does not belong to this kit: " + item.cardId());
            }
            if (!seenCards.add(item.cardId())) {
                throw new IllegalArgumentException("Duplicate cardId in review request: " + item.cardId());
            }

            CardScheduleStore.CardScheduleUpdateResult result = scheduleStore.update(userId, kitId, item.cardId(), base -> {
                CardSchedule scheduleToUse = base != null ? base : CardSchedule.newCard(item.cardId(), properties.getInitialEaseFactor(), today);
                
                if (!scheduleToUse.isDue(today)) {
                    return new CardScheduleStore.CardScheduleUpdateResult(scheduleToUse, false);
                }
                
                CardSchedule updated = SpacedRepetitionScheduler.review(
                        scheduleToUse, item.rating(), today, properties.getMinEaseFactor(), properties.getMaxIntervalDays());
                return new CardScheduleStore.CardScheduleUpdateResult(updated, true);
            });

            reviewed++;
            if (result.counted()) {
                counted++;
                switch (item.rating()) {
                    case AGAIN -> again++;
                    case HARD -> hard++;
                    case GOOD -> good++;
                    case EASY -> easy++;
                }
            }
            updatedSchedules.add(result.schedule());
        }

        ReviewResponse response = new ReviewResponse(reviewed, counted, again, hard, good, easy, updatedSchedules);
        
        submissionLog.putIfAbsent(userId, submissionIdStr, payloadHash, response, Instant.now(clock)); // Complete the deferred storage

        if (counted > 0) {
            int baseScore = good + easy;
            String eventId = userId + ":REVIEW:" + submissionIdStr;
            publisher.publishEvent(new UserActionCompletedEvent(eventId, userId, null, ActionType.FLASHCARDS_REVIEWED, baseScore));
        }

        return response;
    }

    public QuizSubmissionResponse submitQuiz(Long userId, String kitId, QuizSubmissionRequest request) {
        int payloadHash = request.hashCode();
        String submissionIdStr = request.submissionId().toString();

        SubmissionLog.SubmissionRecord record = submissionLog.get(userId, submissionIdStr);
        if (record != null) {
            if (record.payloadHash() != payloadHash) {
                throw new IllegalStateException("CONFLICT");
            }
            return (QuizSubmissionResponse) record.response();
        }

        StoredStudyKit kit = kitStore.findById(kitId)
                .filter(k -> k.ownerId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));

        Map<String, StoredQuizQuestion> validQuestions = new HashMap<>();
        for (StoredTopicKit t : kit.topics()) {
            for (StoredQuizQuestion q : t.quiz()) {
                validQuestions.put(q.questionId(), q);
            }
        }

        Set<String> answeredIds = new HashSet<>();
        int correctCount = 0;
        List<QuizSubmissionResponse.QuestionResult> results = new ArrayList<>();

        for (QuizSubmissionRequest.QuizAnswer answer : request.answers()) {
            if (!answeredIds.add(answer.questionId())) {
                throw new IllegalArgumentException("Duplicate answer for question: " + answer.questionId());
            }
            StoredQuizQuestion q = validQuestions.get(answer.questionId());
            if (q == null) {
                throw new IllegalArgumentException("Unknown questionId: " + answer.questionId());
            }
            if (answer.selectedOptionIndex() < 0 || answer.selectedOptionIndex() >= q.options().size()) {
                throw new IllegalArgumentException("Option index out of range for question: " + answer.questionId());
            }

            boolean isCorrect = (answer.selectedOptionIndex() == q.correctOptionIndex());
            if (isCorrect) correctCount++;

            results.add(new QuizSubmissionResponse.QuestionResult(q.questionId(), isCorrect, q.correctOptionIndex(), q.explanation()));
        }

        // Unanswered questions are implicitly wrong. The total comes from the kit.
        int totalQuestions = validQuestions.size();
        double percentage = totalQuestions == 0 ? 0 : ((double) correctCount / totalQuestions) * 100.0;
        boolean passed = percentage >= properties.getQuizPassThresholdPercent();

        boolean alreadyPassed = submissionLog.hasPassedQuiz(userId, kitId);
        boolean xpEligible = passed && !alreadyPassed;

        if (xpEligible) {
            submissionLog.markQuizPassed(userId, kitId);
        }

        QuizSubmissionResponse response = new QuizSubmissionResponse(
                correctCount, totalQuestions, percentage, passed, xpEligible, results);
        
        submissionLog.putIfAbsent(userId, submissionIdStr, payloadHash, response, Instant.now(clock));

        if (xpEligible) {
            String eventId = userId + ":QUIZ:" + submissionIdStr;
            publisher.publishEvent(new UserActionCompletedEvent(eventId, userId, null, ActionType.QUIZ_PASSED, correctCount));
        }

        return response;
    }

    public List<CardSchedule> getDueCards(Long userId, String kitId, Integer limit) {
        StoredStudyKit kit = kitStore.findById(kitId)
                .filter(k -> k.ownerId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));

        int actualLimit = limit != null ? Math.min(limit, properties.getMaxDueLimit()) : properties.getDefaultDueLimit();
        LocalDate today = LocalDate.now(clock);

        List<CardSchedule> existingSchedules = scheduleStore.findByUserIdAndKitId(userId, kitId);
        Map<String, CardSchedule> scheduleMap = new HashMap<>();
        for (CardSchedule s : existingSchedules) scheduleMap.put(s.cardId(), s);

        List<CardSchedule> dueCards = new ArrayList<>();
        for (StoredTopicKit t : kit.topics()) {
            for (StoredFlashcard f : t.flashcards()) {
                CardSchedule s = scheduleMap.getOrDefault(f.cardId(), CardSchedule.newCard(f.cardId(), properties.getInitialEaseFactor(), today));
                if (s.isDue(today)) {
                    dueCards.add(s);
                }
            }
        }

        dueCards.sort(Comparator.comparing(CardSchedule::dueDate, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(CardSchedule::easeFactor));

        return dueCards.stream().limit(actualLimit).toList();
    }

    public ProgressResponse getProgress(Long userId, String kitId) {
        StoredStudyKit kit = kitStore.findById(kitId)
                .filter(k -> k.ownerId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));

        LocalDate today = LocalDate.now(clock);
        List<CardSchedule> existingSchedules = scheduleStore.findByUserIdAndKitId(userId, kitId);
        Map<String, CardSchedule> scheduleMap = new HashMap<>();
        for (CardSchedule s : existingSchedules) scheduleMap.put(s.cardId(), s);

        int total = 0, newCards = 0, learning = 0, mature = 0, dueToday = 0;
        double sumEf = 0;
        LocalDate nextDue = null;

        for (StoredTopicKit t : kit.topics()) {
            for (StoredFlashcard f : t.flashcards()) {
                total++;
                CardSchedule s = scheduleMap.getOrDefault(f.cardId(), CardSchedule.newCard(f.cardId(), properties.getInitialEaseFactor(), today));
                sumEf += s.easeFactor();

                if (s.repetitions() == 0) newCards++;
                else if (s.intervalDays() < 21) learning++;
                else mature++;

                if (s.isDue(today)) dueToday++;
                
                if (s.dueDate() != null) {
                    if (nextDue == null || s.dueDate().isBefore(nextDue)) {
                        nextDue = s.dueDate();
                    }
                }
            }
        }

        double avgEf = total == 0 ? 0 : Math.round((sumEf / total) * 100.0) / 100.0;
        return new ProgressResponse(total, newCards, learning, mature, dueToday, avgEf, nextDue);
    }
}
