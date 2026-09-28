package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.study.*;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.service.study.StudySessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/study-kits/{kitId}")
@Tag(name = "Study Sessions V1", description = "Endpoints for spaced repetition and quiz submissions")
@SecurityRequirement(name = "bearerAuth")
public class StudySessionController {

    private final StudySessionService studySessionService;

    public StudySessionController(StudySessionService studySessionService) {
        this.studySessionService = studySessionService;
    }

    @Operation(summary = "Submit a flashcard review batch", description = "Applies SM-2 algorithm to a batch of cards.")
    @io.swagger.v3.oas.annotations.responses.ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Review submitted successfully",
            content = @Content(mediaType = "application/json",
            examples = @ExampleObject(value = "{ \"success\": true, \"message\": \"Review submitted\", \"data\": { \"reviewed\": 1, \"counted\": 1, \"againCount\": 0, \"hardCount\": 0, \"goodCount\": 1, \"easyCount\": 0, \"updatedSchedules\": [] } }"))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request (e.g., duplicate card IDs)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = "{ \"success\": false, \"message\": \"Duplicate cardId in review request: c1\" }"))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Idempotency conflict",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = "{ \"success\": false, \"message\": \"Submission ID already used with a different payload\" }"))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Kit not found or not owned by user",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = "{ \"success\": false, \"message\": \"Study kit not found\" }")))
    })
    @PostMapping("/review")
    public ResponseEntity<ApiResponse<ReviewResponse>> reviewCards(
            @PathVariable String kitId,
            @Valid @RequestBody ReviewRequest request) {
        
        try {
            ReviewResponse response = studySessionService.reviewCards(getUserId(), kitId, request);
            return ResponseEntity.ok(ApiResponse.ok("Review submitted", response));
        } catch (IllegalStateException e) {
            if ("CONFLICT".equals(e.getMessage())) {
                return ResponseEntity.status(409).body(ApiResponse.error("Submission ID already used with a different payload"));
            }
            throw e;
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @Operation(summary = "Submit quiz answers", description = "Grades the quiz on the server and awards XP if passed (first time only).")
    @io.swagger.v3.oas.annotations.responses.ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Quiz graded successfully",
            content = @Content(mediaType = "application/json",
            examples = @ExampleObject(value = "{ \"success\": true, \"message\": \"Quiz graded\", \"data\": { \"score\": 2, \"total\": 3, \"percentage\": 66.6, \"passed\": true, \"xpEligible\": true, \"results\": [] } }"))),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid answers (duplicate or unknown ID)",
            content = @Content(mediaType = "application/json", examples = @ExampleObject(value = "{ \"success\": false, \"message\": \"Unknown questionId: q1\" }")))
    })
    @PostMapping("/quiz-submissions")
    public ResponseEntity<ApiResponse<QuizSubmissionResponse>> submitQuiz(
            @PathVariable String kitId,
            @Valid @RequestBody QuizSubmissionRequest request) {
        try {
            QuizSubmissionResponse response = studySessionService.submitQuiz(getUserId(), kitId, request);
            return ResponseEntity.ok(ApiResponse.ok("Quiz graded", response));
        } catch (IllegalStateException e) {
            if ("CONFLICT".equals(e.getMessage())) {
                return ResponseEntity.status(409).body(ApiResponse.error("Submission ID already used with a different payload"));
            }
            throw e;
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @Operation(summary = "Get due flashcards", description = "Fetches cards that are due for review today or earlier.")
    @GetMapping("/due")
    public ResponseEntity<ApiResponse<List<CardSchedule>>> getDueCards(
            @PathVariable String kitId,
            @Parameter(description = "Maximum number of cards to return") @RequestParam(required = false) Integer limit) {
        
        List<CardSchedule> dueCards = studySessionService.getDueCards(getUserId(), kitId, limit);
        return ResponseEntity.ok(ApiResponse.ok("Due cards retrieved", dueCards));
    }

    @Operation(summary = "Get study progress", description = "Gets statistics on new, learning, and mature cards.")
    @GetMapping("/progress")
    public ResponseEntity<ApiResponse<ProgressResponse>> getProgress(@PathVariable String kitId) {
        ProgressResponse response = studySessionService.getProgress(getUserId(), kitId);
        return ResponseEntity.ok(ApiResponse.ok("Progress retrieved", response));
    }

    private Long getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            if (auth.getPrincipal() instanceof AuthenticatedUser user) {
                return user.id();
            }
            try { return Long.valueOf(auth.getName()); } catch (NumberFormatException ignored) {}
        }
        throw new IllegalStateException("User not authenticated");
    }
}
