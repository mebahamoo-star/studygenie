package com.studygenie.backend.service.port;
import com.studygenie.backend.dto.ai.ParseResponseData;
import org.springframework.stereotype.Component;

@Component
public class DummySyllabusResultStore implements SyllabusResultStore {
    @Override
    public void save(Long courseId, ParseResponseData data) {
        // Dummy
    }
}
