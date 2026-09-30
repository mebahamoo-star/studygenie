package com.studygenie.backend.repository;

import com.studygenie.backend.entity.GamificationEventLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface GamificationEventLogRepository extends JpaRepository<GamificationEventLog, Long> {
    boolean existsByStudentIdAndEventId(Long studentId, String eventId);
    List<GamificationEventLog> findByStudentIdAndCreatedAtAfter(Long studentId, LocalDateTime since);
}
