package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.ai.ParseResponseData;
import com.studygenie.backend.service.ai.SyllabusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/syllabus")
@Tag(name = "Syllabus V1", description = "AI-powered syllabus parsing API")
@SecurityRequirement(name = "bearerAuth")
public class SyllabusController {

    private final SyllabusService syllabusService;

    public SyllabusController(SyllabusService syllabusService) {
        this.syllabusService = syllabusService;
    }

    @Operation(summary = "Parse Syllabus PDF", description = "Extracts structured topics from a syllabus PDF using the AI Engine")
    @PostMapping(value = "/parse", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<ParseResponseData>> parseSyllabus(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "course_name", required = false) String courseName,
            @RequestParam(value = "language_hint", defaultValue = "auto") String languageHint) {

        ParseResponseData data = syllabusService.parseAndSave(file, courseName, languageHint);
        return ResponseEntity.ok(ApiResponse.ok("Syllabus parsed successfully", data));
    }
}
