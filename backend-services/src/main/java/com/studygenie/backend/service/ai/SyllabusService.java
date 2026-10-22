package com.studygenie.backend.service.ai;

import com.studygenie.backend.client.AiEngineClient;
import com.studygenie.backend.dto.ai.ParseResponseData;
import com.studygenie.backend.service.port.SyllabusResultStore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SyllabusService {
    private final AiEngineClient aiEngineClient;
    private final SyllabusResultStore resultStore;

    public SyllabusService(AiEngineClient aiEngineClient, SyllabusResultStore resultStore) {
        this.aiEngineClient = aiEngineClient;
        this.resultStore = resultStore;
    }

    @Transactional
    public ParseResponseData parseAndSave(MultipartFile file, Long courseId, String courseName, String languageHint) {
        ParseResponseData data = aiEngineClient.parseSyllabus(file, courseName, languageHint);
        if (resultStore != null) {
            resultStore.save(courseId, courseName, data);
        }
        return data;
    }
}
