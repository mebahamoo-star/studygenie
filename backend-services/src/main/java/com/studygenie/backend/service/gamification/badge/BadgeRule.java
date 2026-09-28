package com.studygenie.backend.service.gamification.badge;

import com.studygenie.backend.dto.gamification.Badge;
import com.studygenie.backend.dto.gamification.GamificationProfile;

import java.time.Clock;
import java.util.Optional;

public interface BadgeRule {
    /**
     * Evaluates if a profile deserves this badge.
     * @param profile The current profile
     * @param clock The system clock for timestamps
     * @return An Optional containing the Badge if awarded, or empty otherwise.
     */
    Optional<Badge> evaluate(GamificationProfile profile, Clock clock);
}
