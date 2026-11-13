package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.dto.gamification.GamificationSyncRequest;
import com.studygenie.backend.dto.gamification.LeaderboardEntry;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.event.UserActionCompletedEvent;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.service.gamification.LevelCalculator;
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

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/gamification")
@Tag(name = "Gamification V1", description = "Gamification API for XP, Levels, and Badges")
@SecurityRequirement(name = "bearerAuth")
public class GamificationController {

    private final GamificationStore store;
    private final ApplicationEventPublisher publisher;
    private final LevelCalculator levelCalculator;

    public GamificationController(GamificationStore store, ApplicationEventPublisher publisher, LevelCalculator levelCalculator) {
        this.store = store;
        this.publisher = publisher;
        this.levelCalculator = levelCalculator;
    }

    @Operation(summary = "Get User Profile", description = "Fetches the current user's gamification profile")
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<GamificationProfile>> getProfile() {
        Long userId = getUserId();
        GamificationProfile profile = store.getProfile(userId);
        return ResponseEntity.ok(ApiResponse.ok("Gamification profile retrieved", profile));
    }

    @Operation(summary = "Sync Gamification Progress", description = "Syncs client gamification progress (points and streak) to persistent backend state")
    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<GamificationProfile>> syncProgress(@RequestBody GamificationSyncRequest request) {
        Long userId = getUserId();
        GamificationProfile profile = store.update(userId, current -> {
            int reqPoints = (request != null && request.points() != null) ? Math.max(0, request.points()) : 0;
            int reqStreak = (request != null && request.streak() != null) ? Math.max(0, request.streak()) : 0;

            int newPoints = Math.max(current.currentXp(), reqPoints);
            int newStreak = Math.max(current.currentStreakDays(), reqStreak);
            int newLongest = Math.max(current.longestStreakDays(), newStreak);
            LocalDate lastStudy = newStreak > 0
                    ? (current.lastActiveDate() != null ? current.lastActiveDate() : LocalDate.now())
                    : current.lastActiveDate();

            return new GamificationProfile(
                    current.userId(),
                    current.displayName(),
                    newPoints,
                    levelCalculator.calculateLevel(newPoints),
                    newStreak,
                    newLongest,
                    lastStudy,
                    current.unlockedBadges(),
                    current.dailyXp(),
                    current.processedEventIds()
            );
        });
        return ResponseEntity.ok(ApiResponse.ok("Gamification progress synced successfully", profile));
    }

    @Operation(summary = "Get Leaderboard", description = "Fetches the top 10 users by XP")
    @GetMapping("/leaderboard")
    public ResponseEntity<ApiResponse<List<LeaderboardEntry>>> getLeaderboard() {
        List<LeaderboardEntry> leaderboard = store.getTop10();
        return ResponseEntity.ok(ApiResponse.ok("Leaderboard retrieved", leaderboard));
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

