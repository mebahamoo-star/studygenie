package com.studygenie.backend.repository;

import com.studygenie.backend.entity.ExamFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamFeedbackRepository extends JpaRepository<ExamFeedback, Long> {
    List<ExamFeedback> findByCourseId(Long courseId);
    List<ExamFeedback> findByCourseNameIgnoreCase(String courseName);
    Optional<ExamFeedback> findFirstByEnrollmentKey(String enrollmentKey);
    List<ExamFeedback> findByEnrollmentKey(String enrollmentKey);
}
