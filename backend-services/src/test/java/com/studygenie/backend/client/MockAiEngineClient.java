package com.studygenie.backend.client;

import com.studygenie.backend.dto.ai.*;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
@Primary
@Profile("test")
public class MockAiEngineClient implements AiEngineClient {

    @Override
    public ParseResponseData parseSyllabus(MultipartFile file, String courseName, String languageHint) {
        return new ParseResponseData(null, null, null, 0, null, null, 0, 0, null, null);
    }

    @Override
    public StudyKitResponseData generateStudyKit(GenerateStudyKitRequest request) {
        return new StudyKitResponseData(null, null, null);
    }

    @Override
    public PlanResponseData generatePlan(GeneratePlanRequest request) {
        return new PlanResponseData(null, null, null);
    }
}
