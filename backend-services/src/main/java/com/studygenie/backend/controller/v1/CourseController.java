package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.ai.PlanResponseData;
import com.studygenie.backend.dto.browse.CourseCreateRequest;
import com.studygenie.backend.dto.browse.CourseDto;
import com.studygenie.backend.dto.syllabus.TopicDto;
import com.studygenie.backend.service.browse.CourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import com.studygenie.backend.dto.browse.JoinCourseRequest;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Courses", description = "Course and syllabus management API")
public class CourseController {

    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @Operation(summary = "List courses for a college")
    @GetMapping("/colleges/{collegeId}/courses")
    public ResponseEntity<ApiResponse<List<CourseDto>>> getCoursesByCollege(@PathVariable Long collegeId) {
        return ResponseEntity.ok(ApiResponse.ok("Courses fetched successfully", courseService.getCoursesByCollege(collegeId)));
    }

    @Operation(summary = "Get a single course")
    @GetMapping("/courses/{courseId}")
    public ResponseEntity<ApiResponse<CourseDto>> getCourse(@PathVariable Long courseId) {
        return ResponseEntity.ok(ApiResponse.ok("Course fetched successfully", courseService.getCourse(courseId)));
    }

    @Operation(summary = "Get topics for a course")
    @GetMapping("/courses/{courseId}/topics")
    public ResponseEntity<ApiResponse<List<TopicDto>>> getCourseTopics(@PathVariable Long courseId) {
        return ResponseEntity.ok(ApiResponse.ok("Course topics fetched successfully", courseService.getCourseTopics(courseId)));
    }

    @Operation(summary = "Create a new course under a college")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/colleges/{collegeId}/courses")
    public ResponseEntity<ApiResponse<CourseDto>> createCourse(
            @PathVariable Long collegeId,
            @Valid @RequestBody CourseCreateRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Course created or fetched successfully", courseService.createCourse(collegeId, request.name())));
    }

    @Operation(summary = "Get the generated study plan for a joined course")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/courses/{courseId}/plan")
    public ResponseEntity<ApiResponse<PlanResponseData>> getCoursePlan(
            @PathVariable Long courseId,
            @AuthenticationPrincipal com.studygenie.backend.security.AuthenticatedUser userDetails) {
        Long userId = userDetails.id();
        PlanResponseData data = courseService.getPlan(courseId, userId);
        return ResponseEntity.ok(ApiResponse.ok("Study plan fetched successfully", data));
    }

    @Operation(summary = "Join a course and generate a study plan")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/courses/{courseId}/join")
    public ResponseEntity<ApiResponse<PlanResponseData>> joinCourse(
            @PathVariable Long courseId,
            @AuthenticationPrincipal com.studygenie.backend.security.AuthenticatedUser userDetails,
            @Valid @RequestBody JoinCourseRequest body) {
        
        LocalDate examDate = body.examDate();
        Double dailyHours = body.dailyHours();
        String mode = body.mode();

        Long userId = userDetails.id(); 
        
        PlanResponseData data = courseService.joinChallenge(courseId, userId, examDate, dailyHours, mode);
        return ResponseEntity.ok(ApiResponse.ok("Study plan generated successfully", data));
    }
}
