package com.studygenie.backend.controller.internal;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.internal.DigestEntry;
import com.studygenie.backend.service.internal.DigestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/internal/digest")
@Tag(name = "Internal Digest", description = "INTERNAL ENDPOINT - DO NOT EXPOSE TO PUBLIC CLIENTS")
public class DigestController {

    private final DigestService digestService;

    public DigestController(DigestService digestService) {
        this.digestService = digestService;
    }

    @Operation(summary = "Get daily reminders digest", description = "INTERNAL ONLY. Fetches users who need a nudge for due flashcards or streaks at risk.")
    @GetMapping("/daily-reminders")
    public ApiResponse<List<DigestEntry>> getDailyReminders(
            @Parameter(description = "Minimum due cards to trigger a reminder") 
            @RequestParam(defaultValue = "1") int minDueCards) {
        
        List<DigestEntry> reminders = digestService.generateDailyReminders(minDueCards);
        return ApiResponse.ok("Digest generated", reminders);
    }
}

