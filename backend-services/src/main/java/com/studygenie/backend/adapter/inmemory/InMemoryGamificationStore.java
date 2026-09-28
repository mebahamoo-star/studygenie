package com.studygenie.backend.adapter.inmemory;

import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.dto.gamification.LeaderboardEntry;
import com.studygenie.backend.service.port.GamificationStore;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;

@Component
public class InMemoryGamificationStore implements GamificationStore {

    private final ConcurrentHashMap<Long, GamificationProfile> store = new ConcurrentHashMap<>();

    @Override
    public GamificationProfile update(Long userId, UnaryOperator<GamificationProfile> function) {
        return store.compute(userId, (id, current) -> {
            GamificationProfile base = (current == null) ? GamificationProfile.empty(userId) : current;
            return function.apply(base);
        });
    }

    @Override
    public GamificationProfile getProfile(Long userId) {
        return store.getOrDefault(userId, GamificationProfile.empty(userId));
    }

    @Override
    public List<LeaderboardEntry> getTop10() {
        return store.values().stream()
                .sorted(
                        Comparator.comparing(GamificationProfile::currentXp).reversed()
                                .thenComparing(GamificationProfile::displayName)
                                .thenComparing(GamificationProfile::userId) // deterministic tie-break
                )
                .limit(10)
                .map(p -> new LeaderboardEntry(p.displayName(), p.currentXp(), p.currentLevel()))
                .collect(Collectors.toList());
    }
}
