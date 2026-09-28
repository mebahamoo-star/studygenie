package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.PlanResponseData;
import com.studygenie.backend.service.ai.StudyPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/study-plans")
@Tag(name = "Study Plans V1", description = "Algorithmic study plan generation API")
@SecurityRequirement(name = "bearerAuth")
public class StudyPlanV1Controller {

    private final StudyPlanService studyPlanService;

    public StudyPlanV1Controller(StudyPlanService studyPlanService) {
        this.studyPlanService = studyPlanService;
    }

    @Operation(summary = "Generate Study Plan", description = "Generates a study schedule using NORMAL or SURVIVAL mode")
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<PlanResponseData>> generatePlan(
            @Valid @RequestBody GeneratePlanRequest request) {

        PlanResponseData data = studyPlanService.generateAndSave(request);
        return ResponseEntity.ok(ApiResponse.ok("Study plan generated successfully", data));
    }
}
