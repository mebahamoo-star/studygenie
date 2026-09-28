package com.studygenie.backend.service.port;

import com.studygenie.backend.dto.ai.ParseResponseData;

public interface SyllabusResultStore {
    // TODO(persistence): implement with JPA later to store syllabus topics
    void save(Long courseId, ParseResponseData data);
}
