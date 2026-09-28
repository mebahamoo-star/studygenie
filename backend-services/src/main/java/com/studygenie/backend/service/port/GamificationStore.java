package com.studygenie.backend.service.port;

import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.dto.gamification.LeaderboardEntry;

import java.util.List;
import java.util.function.UnaryOperator;

public interface GamificationStore {
    /**
     * Atomically updates the gamification profile for a user.
     * If the profile does not exist, an empty profile is passed to the update function.
     * 
     * @param userId   The user ID
     * @param function The update function
     * @return The updated profile
     */
    GamificationProfile update(Long userId, UnaryOperator<GamificationProfile> function);

    /**
     * Retrieves the profile, or a default empty profile if none exists.
     * Never returns null.
     */
    GamificationProfile getProfile(Long userId);

    /**
     * Retrieves the top 10 users by XP, with deterministic tie-breaking.
     */
    List<LeaderboardEntry> getTop10();
}
