package com.studygenie.backend.service.ai;

import com.studygenie.backend.client.AiEngineClient;
import com.studygenie.backend.dto.ai.*;
import com.studygenie.backend.dto.study.*;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.service.port.StudyKitStore;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class StudyKitService {
    private final AiEngineClient aiEngineClient;
    private final StudyKitStore store;

    public StudyKitService(AiEngineClient aiEngineClient, StudyKitStore store) {
        this.aiEngineClient = aiEngineClient;
        this.store = store;
    }

    public ClientStudyKitResponse generateAndSave(GenerateStudyKitRequest request) {
        StudyKitResponseData data = aiEngineClient.generateStudyKit(request);
        
        Long userId = getUserId();
        String kitId = UUID.randomUUID().toString();
        
        List<StoredTopicKit> storedTopics = data.topics().stream().map(topic -> {
            List<StoredFlashcard> storedCards = topic.flashcards().stream()
                .map(fc -> new StoredFlashcard(UUID.randomUUID().toString(), fc.front(), fc.back()))
                .collect(Collectors.toList());
                
            List<StoredQuizQuestion> storedQuizzes = topic.quiz().stream()
                .map(q -> new StoredQuizQuestion(UUID.randomUUID().toString(), q.type(), q.question(), q.options(), q.correctOptionIndex(), q.explanation()))
                .collect(Collectors.toList());
                
            return new StoredTopicKit(topic.ref(), storedCards, storedQuizzes);
        }).collect(Collectors.toList());

        StoredStudyKit storedKit = new StoredStudyKit(kitId, userId, storedTopics);
        store.save(storedKit);

        return ClientStudyKitResponse.fromStored(storedKit);
    }

    private Long getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            if (auth.getPrincipal() instanceof AuthenticatedUser user) {
                return user.id();
            }
            try { return Long.valueOf(auth.getName()); } catch (NumberFormatException ignored) {}
        }
        throw new IllegalStateException("User not authenticated");
    }
}
