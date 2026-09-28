package com.studygenie.backend.service.port;
import com.studygenie.backend.dto.ai.PlanResponseData;
import org.springframework.stereotype.Component;

@Component
public class DummyStudyPlanResultStore implements StudyPlanResultStore {
    @Override
    public void save(Long userId, PlanResponseData data) {
    }
}
