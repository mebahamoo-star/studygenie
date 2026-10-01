package com.studygenie.backend.repository;

import com.studygenie.backend.entity.PlanTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PlanTaskRepository extends JpaRepository<PlanTask, Long> {
    List<PlanTask> findByStudyPlanIdAndScheduledDate(Long studyPlanId, LocalDate scheduledDate);
    List<PlanTask> findByStudyPlanId(Long studyPlanId);
}

