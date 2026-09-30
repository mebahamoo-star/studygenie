package com.studygenie.backend.service.ai;

import com.studygenie.backend.client.AiEngineClient;
import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.PlanResponseData;
import org.springframework.stereotype.Service;

@Service
public class StudyPlanService {
    private final AiEngineClient aiEngineClient;

    public StudyPlanService(AiEngineClient aiEngineClient) {
        this.aiEngineClient = aiEngineClient;
    }

    public PlanResponseData generatePlan(GeneratePlanRequest request) {
        return aiEngineClient.generatePlan(request);
    }
    
    // Kept for backward compatibility if any other classes depend on it, but doesn't save anymore
    public PlanResponseData generateAndSave(GeneratePlanRequest request) {
        return generatePlan(request);
    }
}
