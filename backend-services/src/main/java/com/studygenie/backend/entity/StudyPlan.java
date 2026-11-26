package com.studygenie.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "study_plans", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"student_id", "course_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @NotNull
    @Column(name = "exam_date", nullable = false)
    private LocalDate examDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "mode", length = 20)
    private String mode;

    @Column(name = "daily_hours")
    private Double dailyHours;

    @Column(name = "rest_weekdays", length = 50)
    private String restWeekdays;

    @Column(name = "buffer_days")
    private Integer bufferDays;

    @Column(name = "study_days")
    private Integer studyDays;

    @Column(name = "capacity_minutes")
    private Integer capacityMinutes;

    @Column(name = "feasible")
    private Boolean feasible;

    @Column(name = "warnings_json", columnDefinition = "TEXT")
    private String warningsJson;

    @Column(name = "skipped_topics_json", columnDefinition = "TEXT")
    private String skippedTopicsJson;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StudyPlan)) return false;
        StudyPlan that = (StudyPlan) o;
        return id != null && id.equals(that.getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
