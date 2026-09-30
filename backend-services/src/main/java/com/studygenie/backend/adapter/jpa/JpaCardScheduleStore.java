package com.studygenie.backend.adapter.jpa;

import com.studygenie.backend.dto.study.CardSchedule;
import com.studygenie.backend.entity.Flashcard;
import com.studygenie.backend.entity.FlashcardReview;
import com.studygenie.backend.enums.ReviewRating;
import com.studygenie.backend.repository.FlashcardRepository;
import com.studygenie.backend.repository.FlashcardReviewRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.service.port.CardScheduleStore;
import com.studygenie.backend.service.study.StudySessionService;
import com.studygenie.backend.exception.DuplicateResourceException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class JpaCardScheduleStore implements CardScheduleStore {

    private final FlashcardReviewRepository reviewRepository;
    private final StudentRepository studentRepository;
    private final FlashcardRepository flashcardRepository;

    public JpaCardScheduleStore(FlashcardReviewRepository reviewRepository,
                                StudentRepository studentRepository,
                                FlashcardRepository flashcardRepository) {
        this.reviewRepository = reviewRepository;
        this.studentRepository = studentRepository;
        this.flashcardRepository = flashcardRepository;
    }

    private Long parseIdSafe(String idStr) {
        try {
            return Long.valueOf(idStr);
        } catch (NumberFormatException e) {
            return (long) Math.abs(idStr.hashCode());
        }
    }

    @Override
    @Transactional
    public CardScheduleUpdateResult update(Long userId, String kitId, String cardId, Function<CardSchedule, CardScheduleUpdateResult> updater) {
        Long flashcardId = parseIdSafe(cardId);

        try {
            return performUpdate(userId, flashcardId, cardId, updater);
        } catch (DataIntegrityViolationException e) {
            try {
                return performUpdate(userId, flashcardId, cardId, updater);
            } catch (DataIntegrityViolationException ex) {
                throw new DuplicateResourceException("Concurrent duplicate review submission");
            }
        }
    }

    private CardScheduleUpdateResult performUpdate(Long userId, Long flashcardId, String cardId, Function<CardSchedule, CardScheduleUpdateResult> updater) {
        Optional<FlashcardReview> existingOpt = reviewRepository.findByStudentIdAndFlashcardId(userId, flashcardId);
        
        CardSchedule base;
        if (existingOpt.isPresent()) {
            FlashcardReview r = existingOpt.get();
            double ease = r.getEaseFactor() != null ? r.getEaseFactor() : 2.5;
            int interval = r.getIntervalDays() != null ? r.getIntervalDays() : 0;
            int reps = r.getRepetitions() != null ? r.getRepetitions() : 0;
            int lapses = r.getLapses() != null ? r.getLapses() : 0;
            
            // lastReviewedDate is implied as "now" conceptually for updates, but CardSchedule expects it.
            // Wait, lastReviewedDate wasn't in DB! I'll derive it from interval Days and dueDate, 
            // or just leave it null if not tracking it strictly. CardSchedule mostly cares about due date.
            LocalDate lastReviewed = r.getNextReviewDate() != null && interval > 0 
                ? r.getNextReviewDate().minusDays(interval) 
                : null;
            
            base = new CardSchedule(cardId, ease, interval, reps, lapses, r.getNextReviewDate(), lastReviewed);
        } else {
            base = null;
        }

        CardScheduleUpdateResult result = updater.apply(base);
        CardSchedule updated = result.schedule();

        FlashcardReview review = existingOpt.orElseGet(() -> {
            FlashcardReview r = new FlashcardReview();
            r.setStudent(studentRepository.findById(userId).orElseThrow());
            r.setFlashcard(flashcardRepository.findById(flashcardId).orElseThrow());
            return r;
        });

        ReviewRating ratingEnum = StudySessionService.currentReviewRating.get();
        int confidence = 3;
        if (ratingEnum != null) {
            confidence = switch (ratingEnum) {
                case AGAIN -> 1;
                case HARD -> 2;
                case GOOD -> 3;
                case EASY -> 4;
            };
        }
        review.setConfidenceRating(confidence);
        review.setNextReviewDate(updated.dueDate());
        review.setEaseFactor(updated.easeFactor());
        review.setIntervalDays(updated.intervalDays());
        review.setRepetitions(updated.repetitions());
        review.setLapses(updated.lapses());

        reviewRepository.saveAndFlush(review);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CardSchedule> findByUserId(Long userId) {
        LocalDate farFuture = LocalDate.now().plusYears(100);
        return reviewRepository.findByStudentIdAndNextReviewDateLessThanEqual(userId, farFuture)
                .stream()
                .map(this::mapToSchedule)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CardSchedule> findByUserIdAndKitId(Long userId, String kitId) {
        Long topicId = parseIdSafe(kitId);
        return findByUserId(userId).stream()
                .filter(cs -> {
                    Flashcard f = flashcardRepository.findById(parseIdSafe(cs.cardId())).orElse(null);
                    return f != null && f.getTopic().getId().equals(topicId);
                })
                .collect(Collectors.toList());
    }
    
    private CardSchedule mapToSchedule(FlashcardReview r) {
        String cardId = String.valueOf(r.getFlashcard().getId());
        double ease = r.getEaseFactor() != null ? r.getEaseFactor() : 2.5;
        int interval = r.getIntervalDays() != null ? r.getIntervalDays() : 0;
        int reps = r.getRepetitions() != null ? r.getRepetitions() : 0;
        int lapses = r.getLapses() != null ? r.getLapses() : 0;
        LocalDate lastReviewed = r.getNextReviewDate() != null && interval > 0 
                ? r.getNextReviewDate().minusDays(interval) 
                : null;
        return new CardSchedule(cardId, ease, interval, reps, lapses, r.getNextReviewDate(), lastReviewed);
    }
}
