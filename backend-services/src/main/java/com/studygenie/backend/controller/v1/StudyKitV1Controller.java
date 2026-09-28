package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.ai.GenerateStudyKitRequest;
import com.studygenie.backend.dto.ai.StudyKitResponseData;
import com.studygenie.backend.service.ai.StudyKitService;
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
@RequestMapping("/api/v1/study-kits")
@Tag(name = "Study Kits V1", description = "AI-powered study kit generation API")
@SecurityRequirement(name = "bearerAuth")
public class StudyKitV1Controller {

    private final StudyKitService studyKitService;

    public StudyKitV1Controller(StudyKitService studyKitService) {
        this.studyKitService = studyKitService;
    }

    @Operation(summary = "Generate Study Kit", description = "Generates flashcards and quizzes for topics")
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<StudyKitResponseData>> generateStudyKit(
            @Valid @RequestBody GenerateStudyKitRequest request) {

        StudyKitResponseData data = studyKitService.generateAndSave(request);
        return ResponseEntity.ok(ApiResponse.ok("Study kit generated successfully", data));
    }
}
