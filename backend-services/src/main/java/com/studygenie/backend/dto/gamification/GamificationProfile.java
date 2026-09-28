package com.studygenie.backend.dto.gamification;

import com.studygenie.backend.enums.ActionType;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

public record GamificationProfile(
        Long userId,
        String displayName,
        int currentXp,
        int currentLevel,
        int currentStreakDays,
        int longestStreakDays,
        LocalDate lastActiveDate,
        List<Badge> unlockedBadges,
        Map<ActionType, Integer> dailyXp,
        Set<String> processedEventIds
) {
    public GamificationProfile {
        unlockedBadges = List.copyOf(unlockedBadges != null ? unlockedBadges : List.of());
        dailyXp = Map.copyOf(dailyXp != null ? dailyXp : Map.of());
        processedEventIds = Set.copyOf(processedEventIds != null ? processedEventIds : Set.of());
    }

    public static GamificationProfile empty(Long userId) {
        return new GamificationProfile(
                userId,
                "User " + userId,
                0,
                1,
                0,
                0,
                null,
                List.of(),
                Map.of(),
                Set.of()
        );
    }
}
