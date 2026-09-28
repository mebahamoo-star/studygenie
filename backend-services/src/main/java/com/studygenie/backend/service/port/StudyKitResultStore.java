package com.studygenie.backend.service.port;
import com.studygenie.backend.dto.ai.StudyKitResponseData;
public interface StudyKitResultStore {
    // TODO(persistence): implement with JPA later to store generated flashcards/quizzes
    void save(Long courseId, StudyKitResponseData data);
}
