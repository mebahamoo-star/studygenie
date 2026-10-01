package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.event.UserActionCompletedEvent;
import com.studygenie.backend.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/gamification")
@Profile("dev")
@Tag(name = "Gamification V1", description = "Gamification API for XP, Levels, and Badges")
@SecurityRequirement(name = "bearerAuth")
public class GamificationDevController {

    private final ApplicationEventPublisher publisher;

    public GamificationDevController(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    @Operation(summary = "Test Trigger Event", description = "DEV ONLY: Triggers a gamification event. Not available in the deployed/demo environment.")
    @PostMapping("/test-trigger")
    public ResponseEntity<ApiResponse<Void>> testTrigger(@RequestParam ActionType actionType) {
        Long userId = getUserId();
        String displayName = getUserEmail().split("@")[0];
        
        publisher.publishEvent(UserActionCompletedEvent.create(userId, displayName, actionType, 1));
        return ResponseEntity.ok(ApiResponse.ok("Test event triggered", null));
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

    private String getUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthenticatedUser user) {
            return user.email();
        }
        return "Unknown";
    }
}
