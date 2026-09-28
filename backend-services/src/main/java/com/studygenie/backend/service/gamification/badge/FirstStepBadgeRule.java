package com.studygenie.backend.service.gamification.badge;
import com.studygenie.backend.dto.gamification.Badge;
import com.studygenie.backend.dto.gamification.GamificationProfile;
import org.springframework.stereotype.Component;
import java.time.Clock;
import java.util.Optional;

@Component
public class FirstStepBadgeRule implements BadgeRule {
    public static final String ID = "FIRST_STEP";

    @Override
    public Optional<Badge> evaluate(GamificationProfile profile, Clock clock) {
        if (profile.currentXp() > 0) {
            return Optional.of(new Badge(ID, "First Step", "Earned your first XP", clock.instant()));
        }
        return Optional.empty();
    }
}
