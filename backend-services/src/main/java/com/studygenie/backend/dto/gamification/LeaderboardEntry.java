package com.studygenie.backend.dto.gamification;

public record LeaderboardEntry(
        String displayName,
        int xp,
        int level
) {}
