package com.studygenie.backend.controller;

import com.studygenie.backend.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/plans")
@Tag(name = "Study Plans", description = "Endpoints for generating and retrieving study plans")
@SecurityRequirement(name = "bearerAuth")
public class StudyPlanController {

    @Operation(summary = "Generate a new study plan", description = "Generates a deterministic study plan (Normal or Survival mode) for the given courses.")
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generatePlan(@RequestBody Map<String, Object> requestParams) {
        
        // MOCK RESPONSE
        Map<String, Object> mockPlan = Map.of(
                "planId", 101,
                "mode", requestParams.getOrDefault("mode", "NORMAL"),
                "summary", Map.of(
                        "totalStudyMinutes", 240,
                        "feasible", true
                ),
                "tasks", List.of(
                        Map.of("date", "2023-10-01", "topicRef", "T1", "taskType", "STUDY", "minutes", 120),
                        Map.of("date", "2023-10-02", "topicRef", "T2", "taskType", "STUDY", "minutes", 90),
                        Map.of("date", "2023-10-03", "topicRef", "T1", "taskType", "REVIEW", "minutes", 30)
                )
        );
        return ResponseEntity.ok(ApiResponse.ok("Plan generated successfully", mockPlan));
    }

    @Operation(summary = "Get current study plan", description = "Retrieves the currently active study plan for the authenticated user.")
    @GetMapping("/current")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentPlan() {
        
        // MOCK RESPONSE
        Map<String, Object> mockPlan = Map.of(
                "planId", 101,
                "status", "ACTIVE",
                "tasks", List.of(
                        Map.of("date", "2023-10-01", "topicRef", "T1", "taskType", "STUDY", "minutes", 120, "completed", true),
                        Map.of("date", "2023-10-02", "topicRef", "T2", "taskType", "STUDY", "minutes", 90, "completed", false)
                )
        );
        return ResponseEntity.ok(ApiResponse.ok(mockPlan));
    }
}
