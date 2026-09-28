package com.studygenie.backend.controller;

import com.studygenie.backend.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/study-kits")
@Tag(name = "Study Kits (Mock)", description = "Mock endpoints for generating and retrieving flashcards and quizzes")
@SecurityRequirement(name = "bearerAuth")
public class StudyKitController {

    @Operation(summary = "Generate study kit for topics", description = "Requests the AI engine to generate flashcards and quizzes for selected topics.")
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateStudyKit(@RequestBody Map<String, Object> requestParams) {
        
        // MOCK RESPONSE
        Map<String, Object> mockKitData = Map.of(
                "jobId", "job-12345",
                "status", "GENERATING",
                "message", "Study kit generation started in the background."
        );
        return ResponseEntity.ok(ApiResponse.ok("Generation started", mockKitData));
    }

    @Operation(summary = "Get topic study kit", description = "Retrieves the flashcards and quizzes generated for a specific topic.")
    @GetMapping("/topics/{topicId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTopicStudyKit(@PathVariable Long topicId) {
        
        // MOCK RESPONSE matching the new ClientStudyKitResponse shape
        Map<String, Object> mockKit = Map.of(
                "kitId", UUID.randomUUID().toString(),
                "topics", List.of(
                        Map.of(
                                "ref", "topic-" + topicId,
                                "flashcards", List.of(
                                        Map.of("cardId", UUID.randomUUID().toString(), "front", "What is Spring Boot?", "back", "An open-source Java-based framework used to create microservices.")
                                ),
                                "quiz", List.of(
                                        Map.of("questionId", UUID.randomUUID().toString(), "type", "MCQ", "question", "Which annotation marks a REST Controller?", 
                                               "options", List.of("@Controller", "@RestController", "@Service", "@Component"))
                                )
                        )
                )
        );
        return ResponseEntity.ok(ApiResponse.ok(mockKit));
    }
}
