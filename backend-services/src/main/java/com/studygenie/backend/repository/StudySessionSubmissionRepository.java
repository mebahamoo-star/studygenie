package com.studygenie.backend.repository;

import com.studygenie.backend.entity.StudySessionSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface StudySessionSubmissionRepository extends JpaRepository<StudySessionSubmission, Long> {
    Optional<StudySessionSubmission> findByUserIdAndSubmissionId(Long userId, String submissionId);
    void deleteByCreatedAtBefore(Instant cutoff);
}
