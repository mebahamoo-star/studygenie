package com.studygenie.backend.service.port;

import com.studygenie.backend.dto.ai.ParseResponseData;

public class DummySyllabusResultStore implements SyllabusResultStore {
    @Override
    public void save(Long courseId, String courseName, ParseResponseData data) {
        // Fallback
    }
}
