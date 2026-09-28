package com.studygenie.backend.client;

import com.studygenie.backend.dto.ai.AiEngineResponse;
import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.GenerateStudyKitRequest;
import com.studygenie.backend.dto.ai.ParseResponseData;
import com.studygenie.backend.dto.ai.PlanResponseData;
import com.studygenie.backend.dto.ai.StudyKitResponseData;
import org.springframework.web.multipart.MultipartFile;

public interface AiEngineClient {
    ParseResponseData parseSyllabus(MultipartFile file, String courseName, String languageHint);
    StudyKitResponseData generateStudyKit(GenerateStudyKitRequest request);
    PlanResponseData generatePlan(GeneratePlanRequest request);
}
