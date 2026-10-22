package com.studygenie.backend.repository;

import com.studygenie.backend.entity.StudyPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudyPlanRepository extends JpaRepository<StudyPlan, Long> {
    List<StudyPlan> findByStudentId(Long studentId);
    List<StudyPlan> findByCourseId(Long courseId);
    Optional<StudyPlan> findByStudentIdAndCourseId(Long studentId, Long courseId);
}
