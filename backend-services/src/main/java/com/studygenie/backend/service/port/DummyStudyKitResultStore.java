package com.studygenie.backend.service.port;
import com.studygenie.backend.dto.ai.StudyKitResponseData;
import org.springframework.stereotype.Component;

@Component
public class DummyStudyKitResultStore implements StudyKitResultStore {
    @Override
    public void save(Long courseId, StudyKitResponseData data) {
    }
}
