package com.studygenie.backend.dto.gamification;

import java.time.Instant;

public record Badge(
        String id,
        String name,
        String description,
        Instant unlockedAt
) {}
