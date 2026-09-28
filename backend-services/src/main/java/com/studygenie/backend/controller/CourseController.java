package com.studygenie.backend.controller;

import com.studygenie.backend.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses")
@Tag(name = "Courses", description = "Course and syllabus management API")
@SecurityRequirement(name = "bearerAuth")
public class CourseController {

    @Operation(summary = "Upload a syllabus PDF", description = "Uploads a syllabus to be parsed by the AI Engine.")
    @PostMapping("/{courseId}/syllabus")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadSyllabus(
            @PathVariable Long courseId,
            @RequestParam("file") MultipartFile file) {
            
        // MOCK RESPONSE
        Map<String, Object> mockData = Map.of(
                "courseId", courseId,
                "topics", List.of(
                        Map.of("orderIndex", 1, "chapterTitle", "Introduction to Spring Boot", "estimatedHours", 2.0),
                        Map.of("orderIndex", 2, "chapterTitle", "REST APIs", "estimatedHours", 3.5)
                )
        );
        return ResponseEntity.ok(ApiResponse.ok("Syllabus parsed successfully", mockData));
    }

    @Operation(summary = "Get course topics", description = "Retrieves the extracted topics for a given course.")
    @GetMapping("/{courseId}/topics")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCourseTopics(@PathVariable Long courseId) {
        
        // MOCK RESPONSE
        List<Map<String, Object>> mockTopics = List.of(
                Map.of("id", 1, "courseId", courseId, "title", "Introduction to Spring Boot", "importance", 3),
                Map.of("id", 2, "courseId", courseId, "title", "REST APIs", "importance", 4)
        );
        return ResponseEntity.ok(ApiResponse.ok(mockTopics));
    }
}
