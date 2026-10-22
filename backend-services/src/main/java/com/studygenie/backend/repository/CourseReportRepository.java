package com.studygenie.backend.repository;

import com.studygenie.backend.entity.CourseReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseReportRepository extends JpaRepository<CourseReport, Long> {
    List<CourseReport> findByOrderByCreatedAtDesc();
    List<CourseReport> findByCourseNameIgnoreCase(String courseName);
}
