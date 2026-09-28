package com.studygenie.backend.client;

import com.studygenie.backend.dto.ai.*;
import com.studygenie.backend.exception.AiEngineBadRequestException;
import com.studygenie.backend.exception.AiEngineException;
import com.studygenie.backend.exception.AiEngineInvalidResponseException;
import com.studygenie.backend.exception.AiEngineTimeoutException;
import com.studygenie.backend.exception.AiEngineUnavailableException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

@Component
public class AiEngineClientImpl implements AiEngineClient {

    private final RestClient restClient;

    public AiEngineClientImpl(RestClient aiEngineRestClient) {
        this.restClient = aiEngineRestClient;
    }

    @Override
    @Retry(name = "aiEngine")
    @CircuitBreaker(name = "aiEngine")
    public ParseResponseData parseSyllabus(MultipartFile file, String courseName, String languageHint) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", file.getResource());
        if (courseName != null && !courseName.isBlank()) {
            body.add("course_name", courseName);
        }
        if (languageHint != null && !languageHint.isBlank()) {
            body.add("language_hint", languageHint);
        }

        return executeRequest(() -> restClient.post()
                .uri("/parse-syllabus")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new AiEngineBadRequestException("Invalid request to AI Engine");
                })
                .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                    throw new AiEngineUnavailableException("AI Engine is unavailable");
                })
                .body(new ParameterizedTypeReference<AiEngineResponse<ParseResponseData>>() {}));
    }

    @Override
    @Retry(name = "aiEngine")
    @CircuitBreaker(name = "aiEngine")
    public StudyKitResponseData generateStudyKit(GenerateStudyKitRequest request) {
        return executeRequest(() -> restClient.post()
                .uri("/generate-study-kit")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new AiEngineBadRequestException("Invalid request to AI Engine");
                })
                .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                    throw new AiEngineUnavailableException("AI Engine is unavailable");
                })
                .body(new ParameterizedTypeReference<AiEngineResponse<StudyKitResponseData>>() {}));
    }

    @Override
    @Retry(name = "aiEngine")
    @CircuitBreaker(name = "aiEngine")
    public PlanResponseData generatePlan(GeneratePlanRequest request) {
        return executeRequest(() -> restClient.post()
                .uri("/generate-plan")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new AiEngineBadRequestException("Invalid request to AI Engine");
                })
                .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                    throw new AiEngineUnavailableException("AI Engine is unavailable");
                })
                .body(new ParameterizedTypeReference<AiEngineResponse<PlanResponseData>>() {}));
    }

    private <T> T executeRequest(RequestExecutor<AiEngineResponse<T>> executor) {
        try {
            AiEngineResponse<T> response = executor.execute();
            if (response == null) {
                throw new AiEngineInvalidResponseException("Empty response from AI Engine");
            }
            if (!response.success()) {
                throw new AiEngineBadRequestException(response.message());
            }
            return response.data();
        } catch (RestClientResponseException ex) {
            throw new AiEngineInvalidResponseException("AI Engine returned unexpected status: " + ex.getStatusCode());
        } catch (AiEngineException ex) {
            throw ex;
        } catch (Exception ex) {
            // Could be a connection timeout or read timeout mapping
            if (ex.getMessage() != null && ex.getMessage().toLowerCase().contains("timeout")) {
                throw new AiEngineTimeoutException("Timeout communicating with AI Engine");
            }
            throw new AiEngineUnavailableException("Error communicating with AI Engine: " + ex.getMessage());
        }
    }

    @FunctionalInterface
    private interface RequestExecutor<R> {
        R execute() throws Exception;
    }
}
