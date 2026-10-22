package com.studygenie.backend.repository;

import com.studygenie.backend.entity.Syllabus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SyllabusRepository extends JpaRepository<Syllabus, Long> {
    Optional<Syllabus> findByCourseId(Long courseId);
}
