package com.studygenie.backend.adapter.inmemory;

import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.dto.study.StoredStudyKit;
import com.studygenie.backend.service.port.StudyKitStore;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

// TODO(persistence): Replace with JPA repository
@Component
public class InMemoryStudyKitStore implements StudyKitStore {
    
    // Store kits by kitId
    private final ConcurrentHashMap<String, StoredStudyKit> kits = new ConcurrentHashMap<>();
    
    // Track insertion order/time for eviction
    private final ConcurrentHashMap<String, Long> insertionTimes = new ConcurrentHashMap<>();
    
    private final StudyLogicProperties properties;

    public InMemoryStudyKitStore(StudyLogicProperties properties) {
        this.properties = properties;
    }

    @Override
    public void save(StoredStudyKit kit) {
        evictIfNecessary(kit.ownerId());
        kits.put(kit.kitId(), kit);
        insertionTimes.put(kit.kitId(), System.currentTimeMillis());
    }

    @Override
    public Optional<StoredStudyKit> findById(String kitId) {
        return Optional.ofNullable(kits.get(kitId));
    }

    private void evictIfNecessary(Long ownerId) {
        long count = kits.values().stream().filter(k -> k.ownerId().equals(ownerId)).count();
        if (count >= properties.getMaxKitsPerUser()) {
            kits.values().stream()
                    .filter(k -> k.ownerId().equals(ownerId))
                    .min(Comparator.comparing(k -> insertionTimes.getOrDefault(k.kitId(), 0L)))
                    .ifPresent(oldest -> {
                        kits.remove(oldest.kitId());
                        insertionTimes.remove(oldest.kitId());
                    });
        }
    }
}
