package com.studygenie.backend.service.ai;

import com.studygenie.backend.client.AiEngineClient;
import com.studygenie.backend.dto.ai.ParseResponseData;
import com.studygenie.backend.service.port.SyllabusResultStore;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class SyllabusService {
    private final AiEngineClient aiEngineClient;
    private final SyllabusResultStore resultStore;

    public SyllabusService(AiEngineClient aiEngineClient, SyllabusResultStore resultStore) {
        this.aiEngineClient = aiEngineClient;
        this.resultStore = resultStore;
    }

    public ParseResponseData parseAndSave(MultipartFile file, String courseName, String languageHint) {
        ParseResponseData data = aiEngineClient.parseSyllabus(file, courseName, languageHint);
        if (resultStore != null) {
            resultStore.save(null, data); // TODO: pass actual course ID when persistence is ready
        }
        return data;
    }
}
