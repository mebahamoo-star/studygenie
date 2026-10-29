package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.browse.CollegeDto;
import com.studygenie.backend.service.browse.CollegeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/universities")
@Tag(name = "Colleges", description = "College browsing API")
public class CollegeController {

    private final CollegeService collegeService;

    public CollegeController(CollegeService collegeService) {
        this.collegeService = collegeService;
    }

    @Operation(summary = "List colleges for a university")
    @GetMapping("/{universityId}/colleges")
    public ResponseEntity<ApiResponse<List<CollegeDto>>> getCollegesByUniversity(@PathVariable Long universityId) {
        return ResponseEntity.ok(ApiResponse.ok("Colleges fetched successfully", collegeService.getCollegesByUniversity(universityId)));
    }

    @Operation(summary = "Create or find a college under a university")
    @PostMapping("/{universityId}/colleges")
    public ResponseEntity<ApiResponse<CollegeDto>> createCollege(
            @PathVariable Long universityId,
            @RequestBody Map<String, String> body) {
        String name = body.get("name");
        CollegeDto dto = collegeService.createCollege(universityId, name);
        return ResponseEntity.ok(ApiResponse.ok("College created or found successfully", dto));
    }
}
