package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.dto.gamification.LeaderboardEntry;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.event.UserActionCompletedEvent;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.service.port.GamificationStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/gamification")
@Tag(name = "Gamification V1", description = "Gamification API for XP, Levels, and Badges")
@SecurityRequirement(name = "bearerAuth")
public class GamificationController {

    private final GamificationStore store;
    private final ApplicationEventPublisher publisher;

    public GamificationController(GamificationStore store, ApplicationEventPublisher publisher) {
        this.store = store;
        this.publisher = publisher;
    }

    @Operation(summary = "Get User Profile", description = "Fetches the current user's gamification profile")
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<GamificationProfile>> getProfile() {
        Long userId = getUserId();
        GamificationProfile profile = store.getProfile(userId);
        return ResponseEntity.ok(ApiResponse.ok("Gamification profile retrieved", profile));
    }

    @Operation(summary = "Get Leaderboard", description = "Fetches the top 10 users by XP")
    @GetMapping("/leaderboard")
    public ResponseEntity<ApiResponse<List<LeaderboardEntry>>> getLeaderboard() {
        List<LeaderboardEntry> leaderboard = store.getTop10();
        return ResponseEntity.ok(ApiResponse.ok("Leaderboard retrieved", leaderboard));
    }

    @Profile("dev")
    @Operation(summary = "Test Trigger Event", description = "DEV ONLY: Triggers a gamification event")
    @PostMapping("/test-trigger")
    public ResponseEntity<ApiResponse<Void>> testTrigger(@RequestParam ActionType actionType) {
        // TODO: remove before release
        Long userId = getUserId();
        String displayName = getUserEmail().split("@")[0];
        
        // Base score is set to 1 on the server to prevent client spoofing
        publisher.publishEvent(UserActionCompletedEvent.create(userId, displayName, actionType, 1));
        return ResponseEntity.ok(ApiResponse.ok("Test event triggered", null));
    }

    private Long getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            if (auth.getPrincipal() instanceof AuthenticatedUser user) {
                return user.id();
            }
            // Fallback for @WithMockUser tests
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
