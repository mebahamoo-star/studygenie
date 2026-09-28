package com.studygenie.backend.service.gamification.badge;
import com.studygenie.backend.config.GamificationProperties;
import com.studygenie.backend.dto.gamification.Badge;
import com.studygenie.backend.dto.gamification.GamificationProfile;
import org.springframework.stereotype.Component;
import java.time.Clock;
import java.util.Optional;

@Component
public class StreakBadgeRule implements BadgeRule {
    public static final String ID = "STREAK_MASTER";
    private final GamificationProperties properties;

    public StreakBadgeRule(GamificationProperties properties) {
        this.properties = properties;
    }

    @Override
    public Optional<Badge> evaluate(GamificationProfile profile, Clock clock) {
        if (profile.currentStreakDays() >= properties.getStreakBadgeThresholdDays()) {
            return Optional.of(new Badge(ID, "Streak Master", "Maintained a streak for " + properties.getStreakBadgeThresholdDays() + " days", clock.instant()));
        }
        return Optional.empty();
    }
}
