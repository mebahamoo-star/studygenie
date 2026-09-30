package com.studygenie.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "flashcard_reviews", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"student_id", "flashcard_id"})
}, indexes = {
    @Index(name = "idx_flashcard_reviews_student_next_review", columnList = "student_id, next_review_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlashcardReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flashcard_id", nullable = false)
    private Flashcard flashcard;

    @NotNull
    @Min(1)
    @Max(5)
    @Column(name = "confidence_rating", nullable = false)
    private Integer confidenceRating;

    @NotNull
    @Column(name = "next_review_date", nullable = false)
    private LocalDate nextReviewDate;

    @Column(name = "ease_factor")
    private Double easeFactor;

    @Column(name = "interval_days")
    private Integer intervalDays;

    @Column(name = "repetitions")
    private Integer repetitions;

    @Column(name = "lapses")
    private Integer lapses;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof FlashcardReview)) return false;
        FlashcardReview that = (FlashcardReview) o;
        return id != null && id.equals(that.getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
