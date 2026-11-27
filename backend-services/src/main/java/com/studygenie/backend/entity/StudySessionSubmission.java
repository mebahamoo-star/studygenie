package com.studygenie.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "study_session_submissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "submission_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudySessionSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @NotNull
    @Column(name = "submission_id", nullable = false, length = 100)
    private String submissionId;

    @NotNull
    @Column(name = "payload_hash", nullable = false)
    private Integer payloadHash;

    @NotNull
    @Column(name = "response_type", nullable = false, length = 32)
    private String responseType;

    @NotNull
    @Column(name = "response_json", nullable = false, columnDefinition = "TEXT")
    private String responseJson;

    @NotNull
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
