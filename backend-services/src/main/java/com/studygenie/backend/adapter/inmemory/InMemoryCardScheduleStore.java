package com.studygenie.backend.adapter.inmemory;

import com.studygenie.backend.dto.study.CardSchedule;
import com.studygenie.backend.service.port.CardScheduleStore;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

// TODO(persistence): Replace with JPA repository
@Component
public class InMemoryCardScheduleStore implements CardScheduleStore {

    // Key: userId:kitId:cardId
    private final ConcurrentHashMap<String, CardSchedule> store = new ConcurrentHashMap<>();

    @Override
    public CardScheduleUpdateResult update(Long userId, String kitId, String cardId, Function<CardSchedule, CardScheduleUpdateResult> updater) {
        String key = userId + ":" + kitId + ":" + cardId;
        CardScheduleUpdateResult[] resultRef = new CardScheduleUpdateResult[1];
        
        store.compute(key, (k, current) -> {
            CardSchedule base = current;
            if (base == null) {
                // In a real system, the initial schedule would be passed, but the service creates it in the updater if needed
                // We will rely on the updater to handle null, or we construct a default new card.
                // Wait, the interface doesn't pass 'today', so we'll pass null and let the updater deal with it
                base = null; 
            }
            CardScheduleUpdateResult result = updater.apply(base);
            resultRef[0] = result;
            return result.schedule();
        });
        
        return resultRef[0];
    }

    @Override
    public List<CardSchedule> findByUserIdAndKitId(Long userId, String kitId) {
        String prefix = userId + ":" + kitId + ":";
        return store.entrySet().stream()
                .filter(e -> e.getKey().startsWith(prefix))
                .map(Map.Entry::getValue)
                .collect(Collectors.toList());
    }
}
