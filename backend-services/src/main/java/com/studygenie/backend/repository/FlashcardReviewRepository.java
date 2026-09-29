package com.studygenie.backend.repository;

import com.studygenie.backend.entity.FlashcardReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FlashcardReviewRepository extends JpaRepository<FlashcardReview, Long> {
    List<FlashcardReview> findByStudentIdAndNextReviewDateLessThanEqual(Long studentId, LocalDate date);
}
