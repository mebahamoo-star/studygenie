package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.ai.GenerateStudyKitRequest;
import com.studygenie.backend.dto.study.ClientStudyKitResponse;
import com.studygenie.backend.service.ai.StudyKitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/study-kits")
@Tag(name = "Study Kits V1", description = "AI-powered study kit generation API")
@SecurityRequirement(name = "bearerAuth")
public class StudyKitV1Controller {

    private final StudyKitService studyKitService;

    public StudyKitV1Controller(StudyKitService studyKitService) {
        this.studyKitService = studyKitService;
    }

    @Operation(summary = "Generate a study kit", description = "Generates flashcards and quizzes using the AI Engine and saves it for the user.")
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<ClientStudyKitResponse>> generateStudyKit(
            @Valid @RequestBody GenerateStudyKitRequest request) {
                if (request.topics() == null || request.topics().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(
                    "Cannot generate study kit without syllabus topics. Please upload the course syllabus first.",
                    "NO_SYLLABUS_TOPICS"));
        }

        ClientStudyKitResponse data = studyKitService.generateAndSave(request);
        return ResponseEntity.ok(ApiResponse.ok("Study kit generated and saved successfully", data));
    }

    @Operation(summary = "List user study kits", description = "Returns persisted study kits for the authenticated user, optionally filtered by courseId.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ClientStudyKitResponse>>> getStudyKits(
            @RequestParam(required = false) Long courseId) {
        return ResponseEntity.ok(ApiResponse.ok("Study kits retrieved", studyKitService.getKitsForUser(courseId)));
    }

    @Operation(summary = "Get study kit by ID", description = "Returns a persisted study kit owned by the authenticated user.")
    @GetMapping("/{kitId}")
    public ResponseEntity<ApiResponse<ClientStudyKitResponse>> getStudyKit(@PathVariable String kitId) {
        return ResponseEntity.ok(ApiResponse.ok("Study kit retrieved", studyKitService.getKitById(kitId)));
    }
}
