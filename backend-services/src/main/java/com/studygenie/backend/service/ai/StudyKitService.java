package com.studygenie.backend.service.ai;

import com.studygenie.backend.client.AiEngineClient;
import com.studygenie.backend.dto.ai.GenerateStudyKitRequest;
import com.studygenie.backend.dto.ai.StudyKitResponseData;
import com.studygenie.backend.service.port.StudyKitResultStore;
import org.springframework.stereotype.Service;

@Service
public class StudyKitService {
    private final AiEngineClient aiEngineClient;
    private final StudyKitResultStore resultStore;

    public StudyKitService(AiEngineClient aiEngineClient, StudyKitResultStore resultStore) {
        this.aiEngineClient = aiEngineClient;
        this.resultStore = resultStore;
    }

    public StudyKitResponseData generateAndSave(GenerateStudyKitRequest request) {
        StudyKitResponseData data = aiEngineClient.generateStudyKit(request);
        resultStore.save(null, data); // TODO: pass actual course ID
        return data;
    }
}
