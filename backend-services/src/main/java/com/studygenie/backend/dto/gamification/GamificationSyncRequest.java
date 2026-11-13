package com.studygenie.backend.dto.gamification;

public record GamificationSyncRequest(
        Integer points,
        Integer streak
) {}
