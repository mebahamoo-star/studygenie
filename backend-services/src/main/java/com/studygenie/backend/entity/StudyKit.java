package com.studygenie.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "study_kits", indexes = {
    @Index(name = "idx_study_kits_student_course", columnList = "student_id, course_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyKit {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "course_name", length = 200)
    private String courseName;

    @Column(name = "language", length = 16)
    @Builder.Default
    private String language = "en";

    @Column(name = "quiz_passed")
    @Builder.Default
    private Boolean quizPassed = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StudyKit)) return false;
        StudyKit that = (StudyKit) o;
        return id != null && id.equals(that.getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
