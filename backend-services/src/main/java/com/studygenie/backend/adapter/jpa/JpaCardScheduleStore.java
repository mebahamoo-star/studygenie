package com.studygenie.backend.adapter.jpa;

import com.studygenie.backend.dto.study.CardSchedule;
import com.studygenie.backend.entity.Flashcard;
import com.studygenie.backend.entity.FlashcardReview;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.repository.FlashcardRepository;
import com.studygenie.backend.repository.FlashcardReviewRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.service.port.CardScheduleStore;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class JpaCardScheduleStore implements CardScheduleStore {

    private final FlashcardReviewRepository reviewRepository;
    private final StudentRepository studentRepository;
    private final FlashcardRepository flashcardRepository;

    private final ConcurrentHashMap<String, CardScheduleExtra> memoryCache = new ConcurrentHashMap<>();

    private record CardScheduleExtra(
            double easeFactor,
            int intervalDays,
            int repetitions,
            int lapses,
            LocalDate lastReviewedDate
    ) {
        static CardScheduleExtra initial() {
            return new CardScheduleExtra(2.5, 0, 0, 0, null);
        }
    }

    public JpaCardScheduleStore(FlashcardReviewRepository reviewRepository,
                                StudentRepository studentRepository,
                                FlashcardRepository flashcardRepository) {
        this.reviewRepository = reviewRepository;
        this.studentRepository = studentRepository;
        this.flashcardRepository = flashcardRepository;
    }

    private String cacheKey(Long userId, String cardId) {
        return userId + ":" + cardId;
    }

    @Override
    @Transactional
    public CardScheduleUpdateResult update(Long userId, String kitId, String cardId, Function<CardSchedule, CardScheduleUpdateResult> updater) {
        Long flashcardId = Long.valueOf(cardId);
        String key = cacheKey(userId, cardId);

        Optional<FlashcardReview> existingOpt = reviewRepository.findByStudentIdAndFlashcardId(userId, flashcardId);
        
        CardSchedule base;
        if (existingOpt.isPresent()) {
            FlashcardReview r = existingOpt.get();
            CardScheduleExtra extra = memoryCache.getOrDefault(key, CardScheduleExtra.initial());
            base = new CardSchedule(cardId, extra.easeFactor(), extra.intervalDays(), extra.repetitions(), extra.lapses(), r.getNextReviewDate(), extra.lastReviewedDate());
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

        // The UI scale or SM-2 logic might not explicitly provide a confidence rating on creation,
        // so we default it or map if possible. CardSchedule has no confidence rating, so default 3.
        review.setConfidenceRating(3);
        review.setNextReviewDate(updated.dueDate());

        try {
            reviewRepository.saveAndFlush(review);
        } catch (DataIntegrityViolationException e) {
            // Concurrent insert race condition caught by UNIQUE constraint. 
            // In a real app we might retry, but throwing here is safe.
            throw new IllegalStateException("Duplicate review submission", e);
        }

        memoryCache.put(key, new CardScheduleExtra(
                updated.easeFactor(),
                updated.intervalDays(),
                updated.repetitions(),
                updated.lapses(),
                updated.lastReviewedDate()
        ));

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CardSchedule> findByUserId(Long userId) {
        // Technically this gets ALL due cards, but CardScheduleStore interface expects all schedules for user
        // We will fetch all reviews and map them. Since FlashcardReviewRepository doesn't have findAllByStudentId, 
        // we can fetch via student's reviews if mapped, but we just fetch via due date MAX.
        return reviewRepository.findByStudentIdAndNextReviewDateLessThanEqual(userId, LocalDate.MAX)
                .stream()
                .map(r -> {
                    String cardId = String.valueOf(r.getFlashcard().getId());
                    CardScheduleExtra extra = memoryCache.getOrDefault(cacheKey(userId, cardId), CardScheduleExtra.initial());
                    return new CardSchedule(cardId, extra.easeFactor(), extra.intervalDays(), extra.repetitions(), extra.lapses(), r.getNextReviewDate(), extra.lastReviewedDate());
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CardSchedule> findByUserIdAndKitId(Long userId, String kitId) {
        // Flashcards are linked to Topic (which might be kit). 
        // To strictly implement this, we filter by topicId == kitId.
        Long topicId = Long.valueOf(kitId);
        return findByUserId(userId).stream()
                .filter(cs -> {
                    Flashcard f = flashcardRepository.findById(Long.valueOf(cs.cardId())).orElse(null);
                    return f != null && f.getTopic().getId().equals(topicId);
                })
                .collect(Collectors.toList());
    }
}
