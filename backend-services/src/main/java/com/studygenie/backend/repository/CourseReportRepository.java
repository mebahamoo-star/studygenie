package com.studygenie.backend.repository;

import com.studygenie.backend.entity.CourseReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface CourseReportRepository extends JpaRepository<CourseReport, Long>, JpaSpecificationExecutor<CourseReport> {
    List<CourseReport> findByOrderByCreatedAtDesc();
    List<CourseReport> findByCourseNameIgnoreCase(String courseName);
    List<CourseReport> findByCourseId(Long courseId);
    long countByStatusIn(Collection<String> statuses);
    long countByCourseIdAndStatusIn(Long courseId, Collection<String> statuses);
}
