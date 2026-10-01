package com.studygenie.backend.client;

import com.studygenie.backend.dto.ai.*;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

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
        if (request.topics() != null && !request.topics().isEmpty()) {
            Task task = new Task(LocalDate.now(), request.topics().get(0).ref(), "LEARN", 120);
            return new PlanResponseData(List.of(task), List.of(), new PlanSummary("NORMAL", 1, 120, 120, 1, 0, true, List.of()));
        }
        return new PlanResponseData(List.of(), List.of(), new PlanSummary("NORMAL", 0, 0, 0, 0, 0, true, List.of()));
    }
}

