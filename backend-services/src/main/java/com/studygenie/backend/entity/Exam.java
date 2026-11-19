package com.studygenie.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "exams")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @NotBlank
    @Size(max = 150)
    @Column(name = "course_name", nullable = false, length = 150)
    private String course;

    @NotBlank
    @Size(max = 50)
    @Column(name = "exam_type", nullable = false, length = 50)
    private String type;

    @NotNull
    @Column(name = "exam_date", nullable = false)
    private LocalDate date;

    @Size(max = 120)
    @Column(name = "professor", length = 120)
    private String professor;

    @Size(max = 120)
    @Column(name = "uploader_name", length = 120)
    private String uploaderName;

    @Column(name = "course_id")
    private Long courseId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Exam)) return false;
        Exam that = (Exam) o;
        return id != null && id.equals(that.getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
