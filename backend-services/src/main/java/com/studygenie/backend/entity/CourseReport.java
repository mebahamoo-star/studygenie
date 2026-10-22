package com.studygenie.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "course_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CourseReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_id")
    private Long courseId;

    @NotBlank
    @Size(max = 150)
    @Column(name = "course_name", nullable = false, length = 150)
    private String courseName;

    @Size(max = 150)
    @Column(name = "reported_by", length = 150)
    private String reportedBy;

    @NotBlank
    @Size(max = 100)
    @Column(name = "reason", nullable = false, length = 100)
    private String reason;

    @Size(max = 2000)
    @Column(name = "details", length = 2000)
    private String details;

    @Size(max = 50)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "PENDING";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
