package com.studygenie.backend.service.port;

import com.studygenie.backend.dto.ai.ParseResponseData;

public interface SyllabusResultStore {
    void save(Long courseId, String courseName, ParseResponseData data);
}
