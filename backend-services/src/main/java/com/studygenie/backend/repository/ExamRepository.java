package com.studygenie.backend.repository;

import com.studygenie.backend.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamRepository extends JpaRepository<Exam, Long> {
    List<Exam> findByStudentIdOrderByDateAsc(Long studentId);
}
