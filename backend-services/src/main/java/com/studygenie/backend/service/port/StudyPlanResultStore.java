package com.studygenie.backend.service.port;
import com.studygenie.backend.dto.ai.PlanResponseData;
public interface StudyPlanResultStore {
    // TODO(persistence): implement with JPA later to store generated plans
    void save(Long userId, PlanResponseData data);
}
