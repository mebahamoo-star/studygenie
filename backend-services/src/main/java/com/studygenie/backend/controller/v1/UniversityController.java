package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.browse.UniversityDto;
import com.studygenie.backend.service.browse.UniversityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/universities")
@Tag(name = "Universities", description = "University browsing API")
public class UniversityController {

    private final UniversityService universityService;

    public UniversityController(UniversityService universityService) {
        this.universityService = universityService;
    }

    @Operation(summary = "List all universities")
    @GetMapping
    public ResponseEntity<ApiResponse<List<UniversityDto>>> getAllUniversities() {
        return ResponseEntity.ok(ApiResponse.ok("Universities fetched successfully", universityService.getAllUniversities()));
    }

    @Operation(summary = "Get a single university")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UniversityDto>> getUniversity(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("University fetched successfully", universityService.getUniversity(id)));
    }

    @Operation(summary = "Create or find a university by name")
    @PostMapping
    public ResponseEntity<ApiResponse<UniversityDto>> createUniversity(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        UniversityDto dto = universityService.createUniversity(name);
        return ResponseEntity.ok(ApiResponse.ok("University created or found successfully", dto));
    }
}
