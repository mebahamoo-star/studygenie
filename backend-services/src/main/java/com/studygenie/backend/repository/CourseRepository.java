package com.studygenie.backend.repository;

import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.enums.CourseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long>, JpaSpecificationExecutor<Course> {
    List<Course> findByCollegeId(Long collegeId);
    Optional<Course> findFirstByNameIgnoreCase(String name);
    long countByDeletedAtIsNull();
    long countByStatusAndDeletedAtIsNull(CourseStatus status);
}
