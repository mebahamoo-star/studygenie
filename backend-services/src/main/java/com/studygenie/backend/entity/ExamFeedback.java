package com.studygenie.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "exam_feedbacks", indexes = {
    @Index(name = "idx_exam_feedback_course_id", columnList = "course_id"),
    @Index(name = "idx_exam_feedback_enrollment_key", columnList = "enrollment_key")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id")
    private Long courseId;

    @Column(name = "course_name", length = 255)
    private String courseName;

    @Column(name = "enrollment_key", length = 255)
    private String enrollmentKey;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "difficulty", length = 20)
    private String difficulty;

    @Column(name = "hard_topic_ids_json", columnDefinition = "TEXT")
    private String hardTopicIdsJson;

    @Column(name = "tested_topic_ids_json", columnDefinition = "TEXT")
    private String testedTopicIdsJson;

    @Column(name = "celebration_seen")
    @Builder.Default
    private Boolean celebrationSeen = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
