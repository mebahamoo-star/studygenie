package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.feedback.CourseFeedbackSummary;
import com.studygenie.backend.dto.feedback.ExamFeedbackPayload;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.service.feedback.ExamFeedbackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@Tag(name = "Post-Exam Feedback", description = "Endpoints for capturing post-exam feedback and retrieving course feedback summaries")
public class EnrollmentFeedbackController {

    private final ExamFeedbackService feedbackService;

    public EnrollmentFeedbackController(ExamFeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @Operation(summary = "Mark celebration seen")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping({"/api/enrollments/{id}/celebration-seen", "/api/v1/enrollments/{id}/celebration-seen"})
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> markCelebrationSeen(
            @PathVariable("id") String enrollmentId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        Long userId = (user != null) ? user.id() : null;
        feedbackService.markCelebrationSeen(enrollmentId, userId);
        return ResponseEntity.ok(ApiResponse.ok("Celebration marked as seen", Map.of("success", true)));
    }

    @Operation(summary = "Submit post-exam feedback")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping({"/api/enrollments/{id}/feedback", "/api/v1/enrollments/{id}/feedback"})
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> submitFeedback(
            @PathVariable("id") String enrollmentId,
            @RequestBody ExamFeedbackPayload payload,
            @AuthenticationPrincipal AuthenticatedUser user) {
        Long userId = (user != null) ? user.id() : null;
        feedbackService.saveFeedback(enrollmentId, userId, payload);
        return ResponseEntity.ok(ApiResponse.ok("Feedback submitted successfully", Map.of("success", true)));
    }

    @Operation(summary = "Get course feedback summary")
    @GetMapping({"/api/courses/{courseId}/feedback-summary", "/api/v1/courses/{courseId}/feedback-summary"})
    public ResponseEntity<ApiResponse<CourseFeedbackSummary>> getCourseFeedbackSummary(
            @PathVariable("courseId") String courseId) {
        CourseFeedbackSummary summary = feedbackService.getFeedbackSummary(courseId);
        return ResponseEntity.ok(ApiResponse.ok("Course feedback summary fetched", summary));
    }

    @Operation(summary = "Get course feedback summary by name")
    @GetMapping({"/api/courses/feedback-summary", "/api/v1/courses/feedback-summary"})
    public ResponseEntity<ApiResponse<CourseFeedbackSummary>> getCourseFeedbackSummaryByName(
            @RequestParam(value = "courseName", required = false, defaultValue = "") String courseName) {
        CourseFeedbackSummary summary = feedbackService.getFeedbackSummary(courseName);
        return ResponseEntity.ok(ApiResponse.ok("Course feedback summary fetched", summary));
    }
}
