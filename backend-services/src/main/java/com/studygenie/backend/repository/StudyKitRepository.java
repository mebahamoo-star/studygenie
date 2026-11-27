package com.studygenie.backend.repository;

import com.studygenie.backend.entity.StudyKit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudyKitRepository extends JpaRepository<StudyKit, String> {
    List<StudyKit> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<StudyKit> findByStudentIdAndCourseIdOrderByCreatedAtDesc(Long studentId, Long courseId);
    List<StudyKit> findByCourseId(Long courseId);
}
