package com.studygenie.backend.service.gamification;

import com.studygenie.backend.config.GamificationProperties;
import com.studygenie.backend.dto.gamification.Badge;
import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.event.UserActionCompletedEvent;
import com.studygenie.backend.service.gamification.badge.BadgeRule;
import com.studygenie.backend.service.port.GamificationStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.*;

@Service
public class GamificationService {

    private static final Logger log = LoggerFactory.getLogger(GamificationService.class);

    private final GamificationStore store;
    private final GamificationProperties properties;
    private final LevelCalculator levelCalculator;
    private final List<BadgeRule> badgeRules;
    private final Clock clock;

    public GamificationService(
            GamificationStore store,
            GamificationProperties properties,
            LevelCalculator levelCalculator,
            List<BadgeRule> badgeRules,
            Clock clock) {
        this.store = store;
        this.properties = properties;
        this.levelCalculator = levelCalculator;
        this.badgeRules = badgeRules;
        this.clock = clock;
    }

    @EventListener
    public void handleUserAction(UserActionCompletedEvent event) {
        try {
            store.update(event.userId(), currentProfile -> {
                // Idempotency check
                if (currentProfile.processedEventIds().contains(event.eventId())) {
                    log.debug("Event {} already processed for user {}", event.eventId(), event.userId());
                    return currentProfile;
                }

                LocalDate today = LocalDate.now(clock);
                GamificationProfile profile = updateStreakAndDailyXp(currentProfile, today);

                // Add display name if missing
                String displayName = profile.displayName();
                if (displayName.startsWith("User ") && event.displayName() != null) {
                    displayName = event.displayName();
                }

                int xpToAdd = calculateXp(event.actionType(), event.baseMultiplier(), profile, today);
                int newXp = profile.currentXp() + xpToAdd;
                int newLevel = levelCalculator.calculateLevel(newXp);

                // Update Daily XP Map
                Map<ActionType, Integer> newDailyXp = new EnumMap<>(ActionType.class);
                newDailyXp.putAll(profile.dailyXp());
                newDailyXp.merge(event.actionType(), xpToAdd, Integer::sum);

                // Set new event IDs
                Set<String> newProcessed = new HashSet<>(profile.processedEventIds());
                newProcessed.add(event.eventId());

                GamificationProfile updatedProfile = new GamificationProfile(
                        profile.userId(),
                        displayName,
                        newXp,
                        newLevel,
                        profile.currentStreakDays(),
                        profile.longestStreakDays(),
                        today,
                        profile.unlockedBadges(),
                        newDailyXp,
                        newProcessed
                );

                // Evaluate Badges
                return evaluateBadges(updatedProfile);
            });
        } catch (Exception e) {
            log.error("Failed to process gamification event for user {}: {}", event.userId(), e.getMessage(), e);
        }
    }

    private GamificationProfile updateStreakAndDailyXp(GamificationProfile profile, LocalDate today) {
        if (profile.lastActiveDate() == null) {
            return new GamificationProfile(profile.userId(), profile.displayName(), profile.currentXp(), profile.currentLevel(), 1, 1, today, profile.unlockedBadges(), Map.of(), profile.processedEventIds());
        }

        if (profile.lastActiveDate().isEqual(today)) {
            return profile; // Same day, no streak change, dailyXp kept
        }

        int newStreak = profile.currentStreakDays();
        if (profile.lastActiveDate().plusDays(1).isEqual(today)) {
            newStreak++;
        } else {
            newStreak = 1; // Streak broken
        }
        int newLongest = Math.max(profile.longestStreakDays(), newStreak);

        // Reset Daily XP on a new day
        return new GamificationProfile(
                profile.userId(), profile.displayName(), profile.currentXp(), profile.currentLevel(),
                newStreak, newLongest, today, profile.unlockedBadges(), Map.of(), profile.processedEventIds()
        );
    }

    private int calculateXp(ActionType type, int multiplier, GamificationProfile profile, LocalDate today) {
        Integer base = properties.getXpPerAction().get(type.name());
        if (base == null) return 0;

        int proposedXp = base * multiplier;
        Integer cap = properties.getDailyCapPerAction().get(type.name());
        if (cap != null) {
            int currentToday = profile.dailyXp().getOrDefault(type, 0);
            if (currentToday >= cap) return 0;
            if (currentToday + proposedXp > cap) {
                return cap - currentToday;
            }
        }
        return proposedXp;
    }

    private GamificationProfile evaluateBadges(GamificationProfile profile) {
        List<Badge> newBadges = new ArrayList<>(profile.unlockedBadges());
        Set<String> existingBadgeIds = new HashSet<>();
        for (Badge b : newBadges) {
            existingBadgeIds.add(b.id());
        }

        boolean changed = false;
        for (BadgeRule rule : badgeRules) {
            Optional<Badge> optBadge = rule.evaluate(profile, clock);
            if (optBadge.isPresent() && !existingBadgeIds.contains(optBadge.get().id())) {
                newBadges.add(optBadge.get());
                changed = true;
            }
        }

        if (!changed) return profile;

        return new GamificationProfile(
                profile.userId(), profile.displayName(), profile.currentXp(), profile.currentLevel(),
                profile.currentStreakDays(), profile.longestStreakDays(), profile.lastActiveDate(),
                newBadges, profile.dailyXp(), profile.processedEventIds()
        );
    }
}
