package com.studygenie.backend.repository;

import com.studygenie.backend.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByEmail(String email);
    boolean existsByEmail(String email);

    @Query(value = "SELECT course_id, student_id FROM student_courses", nativeQuery = true)
    List<Object[]> findAllEnrollmentPairs();
}
