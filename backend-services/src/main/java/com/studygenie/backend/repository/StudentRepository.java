package com.studygenie.backend.repository;

import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.enums.AccountStatus;
import com.studygenie.backend.entity.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {
    Optional<Student> findByEmail(String email);
    Optional<Student> findByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);

    long countByRole(Role role);
    long countByRoleAndStatus(Role role, AccountStatus status);
    long countByCreatedAtGreaterThanEqual(LocalDateTime since);
    long countByLastStudyDateGreaterThanEqual(LocalDate since);
    List<Student> findByCreatedAtGreaterThanEqual(LocalDateTime since);
    List<Student> findByLastStudyDateGreaterThanEqual(LocalDate since);

    @Query(value = "SELECT COUNT(*) FROM student_courses", nativeQuery = true)
    long countAllEnrollments();

    @Query(value = "SELECT student_id FROM student_courses WHERE course_id = :courseId", nativeQuery = true)
    List<Long> findStudentIdsEnrolledInCourse(@Param("courseId") Long courseId);

    @Query(value = "SELECT COUNT(*) FROM student_courses WHERE student_id = :studentId", nativeQuery = true)
    long countEnrolledCoursesByStudentId(@Param("studentId") Long studentId);

    @Modifying
    @Query("UPDATE Student s SET s.role = com.studygenie.backend.entity.enums.Role.STUDENT WHERE s.role IS NULL")
    int backfillNullRoles();

    @Modifying
    @Query("UPDATE Student s SET s.status = com.studygenie.backend.entity.enums.AccountStatus.ACTIVE WHERE s.status IS NULL")
    int backfillNullStatuses();

    @Query(value = "SELECT course_id, student_id FROM student_courses", nativeQuery = true)
    List<Object[]> findAllEnrollmentPairs();

    @Query(value = "SELECT COUNT(*) FROM student_courses WHERE course_id = :courseId", nativeQuery = true)
    long countEnrolledStudentsByCourseId(@Param("courseId") Long courseId);

    @Query(value = "SELECT COUNT(*) FROM student_courses WHERE course_id = :courseId AND student_id = :studentId", nativeQuery = true)
    long countEnrollmentByCourseIdAndStudentId(@Param("courseId") Long courseId, @Param("studentId") Long studentId);
}
