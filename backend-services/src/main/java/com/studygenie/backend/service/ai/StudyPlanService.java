package com.studygenie.backend.service.ai;

import com.studygenie.backend.client.AiEngineClient;
import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.PlanResponseData;
import com.studygenie.backend.service.port.StudyPlanResultStore;
import org.springframework.stereotype.Service;

@Service
public class StudyPlanService {
    private final AiEngineClient aiEngineClient;
    private final StudyPlanResultStore resultStore;

    public StudyPlanService(AiEngineClient aiEngineClient, StudyPlanResultStore resultStore) {
        this.aiEngineClient = aiEngineClient;
        this.resultStore = resultStore;
    }

    public PlanResponseData generateAndSave(GeneratePlanRequest request) {
        PlanResponseData data = aiEngineClient.generatePlan(request);
        resultStore.save(null, data); // TODO: pass actual user ID
        return data;
    }
}
