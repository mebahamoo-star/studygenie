package com.studygenie.backend.service.ai;

import com.studygenie.backend.client.AiEngineClient;
import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.PlanResponseData;
import com.studygenie.backend.service.feedback.ExamFeedbackService;
import org.springframework.stereotype.Service;

@Service
public class StudyPlanService {
    private final AiEngineClient aiEngineClient;
    private final ExamFeedbackService feedbackService;

    public StudyPlanService(AiEngineClient aiEngineClient, ExamFeedbackService feedbackService) {
        this.aiEngineClient = aiEngineClient;
        this.feedbackService = feedbackService;
    }

    public PlanResponseData generatePlan(GeneratePlanRequest request) {
        return generatePlan(request, request.getCourseId(), null);
    }

    public PlanResponseData generatePlan(GeneratePlanRequest request, Long courseId, String courseName) {
        GeneratePlanRequest enriched = (courseId != null || (courseName != null && !courseName.isBlank()))
                ? feedbackService.enrichPlanRequest(request, courseId, courseName)
                : request;
        return aiEngineClient.generatePlan(enriched);
    }
    
    // Kept for backward compatibility if any other classes depend on it, but doesn't save anymore
    public PlanResponseData generateAndSave(GeneratePlanRequest request) {
        return generatePlan(request);
    }
}
