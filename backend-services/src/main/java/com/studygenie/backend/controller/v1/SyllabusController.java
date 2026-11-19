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

    private static final long MAX_SYLLABUS_FILE_BYTES = 20L * 1024L * 1024L; // 20 MB

    @Operation(summary = "Parse Syllabus PDF", description = "Extracts structured topics from a syllabus PDF using the AI Engine")
    @PostMapping(value = "/parse", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<ParseResponseData>> parseSyllabus(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "course_id", required = false) Long courseId,
            @RequestParam(value = "course_name", required = false) String courseName,
            @RequestParam(value = "language_hint", defaultValue = "auto") String languageHint) {

        if (file == null || file.isEmpty()) {
            throw new com.studygenie.backend.exception.BadRequestException("Syllabus file is required and must not be empty");
        }
        if (file.getSize() > MAX_SYLLABUS_FILE_BYTES) {
            throw new com.studygenie.backend.exception.BadRequestException("Syllabus file exceeds maximum allowed size of 20 MB");
        }
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        boolean validExt = filename.endsWith(".pdf") || filename.endsWith(".doc") || filename.endsWith(".docx") || filename.endsWith(".txt");
        boolean validMime = contentType.contains("pdf") || contentType.contains("word") || contentType.contains("text/plain") || contentType.contains("octet-stream");
        if (!validExt && !validMime) {
            throw new com.studygenie.backend.exception.BadRequestException("Unsupported file type. Only PDF, Word (.doc/.docx), or plain text files are accepted.");
        }

        ParseResponseData data = syllabusService.parseAndSave(file, courseId, courseName, languageHint);
        return ResponseEntity.ok(ApiResponse.ok("Syllabus parsed successfully", data));
    }
}
