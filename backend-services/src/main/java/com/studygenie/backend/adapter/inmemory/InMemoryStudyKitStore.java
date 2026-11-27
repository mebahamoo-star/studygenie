package com.studygenie.backend.adapter.inmemory;

import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.dto.study.StoredFlashcard;
import com.studygenie.backend.dto.study.StoredQuizQuestion;
import com.studygenie.backend.dto.study.StoredStudyKit;
import com.studygenie.backend.dto.study.StoredTopicKit;
import com.studygenie.backend.service.port.StudyKitStore;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

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
        saveAndReturn(kit);
    }

    @Override
    public StoredStudyKit saveAndReturn(StoredStudyKit kit) {
        evictIfNecessary(kit.ownerId());
        List<StoredTopicKit> normalizedTopics = kit.topics().stream()
                .map(t -> new StoredTopicKit(
                        t.ref(),
                        t.chapterTitle(),
                        t.flashcards().stream()
                                .map(fc -> new StoredFlashcard(
                                        (fc.cardId() != null && !fc.cardId().isBlank()) ? fc.cardId() : UUID.randomUUID().toString(),
                                        fc.front(),
                                        fc.back()))
                                .toList(),
                        t.quiz().stream()
                                .map(q -> new StoredQuizQuestion(
                                        (q.questionId() != null && !q.questionId().isBlank()) ? q.questionId() : UUID.randomUUID().toString(),
                                        q.type(),
                                        q.question(),
                                        q.options(),
                                        q.correctOptionIndex(),
                                        q.correctAnswerText(),
                                        q.explanation()))
                                .toList()
                ))
                .toList();
        StoredStudyKit normalized = new StoredStudyKit(
                kit.kitId(), kit.ownerId(), kit.courseId(), kit.courseName(), kit.language(), normalizedTopics);
        kits.put(normalized.kitId(), normalized);
        insertionTimes.put(normalized.kitId(), System.currentTimeMillis());
        return normalized;
    }

    @Override
    public Optional<StoredStudyKit> findById(String kitId) {
        return Optional.ofNullable(kits.get(kitId));
    }

    @Override
    public List<StoredStudyKit> findByUserId(Long userId) {
        if (userId == null) return List.of();
        return kits.values().stream()
                .filter(k -> userId.equals(k.ownerId()))
                .sorted(Comparator.comparing((StoredStudyKit k) -> insertionTimes.getOrDefault(k.kitId(), 0L)).reversed())
                .collect(Collectors.toList());
    }

    @Override
    public List<StoredStudyKit> findByUserIdAndCourseId(Long userId, Long courseId) {
        if (userId == null || courseId == null) return List.of();
        return kits.values().stream()
                .filter(k -> userId.equals(k.ownerId()) && courseId.equals(k.courseId()))
                .sorted(Comparator.comparing((StoredStudyKit k) -> insertionTimes.getOrDefault(k.kitId(), 0L)).reversed())
                .collect(Collectors.toList());
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
