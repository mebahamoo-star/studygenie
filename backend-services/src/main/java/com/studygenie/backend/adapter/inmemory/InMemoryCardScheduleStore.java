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
                base = null; 
            }
            CardScheduleUpdateResult result = updater.apply(base);
            resultRef[0] = result;
            return result.schedule();
        });
        
        return resultRef[0];
    }

    @Override
    public List<CardSchedule> findByUserId(Long userId) {
        String prefix = userId + ":";
        return store.entrySet().stream()
                .filter(e -> e.getKey().startsWith(prefix))
                .map(Map.Entry::getValue)
                .collect(Collectors.toList());
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
