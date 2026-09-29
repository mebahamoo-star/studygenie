package com.studygenie.backend.dto.internal;

public record DigestEntry(
    Long userId,
    String email,
    String displayName,
    int dueCardsCount,
    boolean streakAtRisk,
    int currentStreakDays,
    int currentXp,
    int currentLevel
) {}
