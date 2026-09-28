package com.studygenie.backend.client;

import com.studygenie.backend.config.AiEngineConfig;
import com.studygenie.backend.config.AiEngineProperties;
import com.studygenie.backend.dto.ai.GenerateStudyKitRequest;
import com.studygenie.backend.exception.AiEngineBadRequestException;
import com.studygenie.backend.exception.AiEngineUnavailableException;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;

public class AiEngineClientTest {

    private MockWebServer mockWebServer;
    private AiEngineClientImpl client;

    @BeforeEach
    void setUp() throws IOException {
        mockWebServer = new MockWebServer();
        mockWebServer.start();

        AiEngineProperties props = new AiEngineProperties();
        props.setBaseUrl(mockWebServer.url("/v1").toString());
        props.setInternalToken("test-token");
        props.setConnectTimeout(Duration.ofSeconds(1));
        props.setReadTimeout(Duration.ofSeconds(1));

        AiEngineConfig config = new AiEngineConfig();
        RestClient restClient = config.aiEngineRestClient(props, RestClient.builder());
        client = new AiEngineClientImpl(restClient);
    }

    @AfterEach
    void tearDown() throws IOException {
        mockWebServer.shutdown();
    }

    @Test
    void testGenerateStudyKit_Success() {
        mockWebServer.enqueue(new MockResponse()
                .setBody("{\"success\":true,\"data\":{\"topics\":[],\"failed_topics\":[],\"meta\":{\"duration_ms\":100}}}")
                .addHeader("Content-Type", "application/json"));

        GenerateStudyKitRequest req = new GenerateStudyKitRequest("Course", "auto", List.of(), 5, 5);
        client.generateStudyKit(req);
    }

    @Test
    void testGenerateStudyKit_BadRequest() {
        mockWebServer.enqueue(new MockResponse().setResponseCode(400));
        GenerateStudyKitRequest req = new GenerateStudyKitRequest("Course", "auto", List.of(), 5, 5);
        assertThrows(AiEngineBadRequestException.class, () -> client.generateStudyKit(req));
    }

    @Test
    void testGenerateStudyKit_ServerError() {
        mockWebServer.enqueue(new MockResponse().setResponseCode(500));
        GenerateStudyKitRequest req = new GenerateStudyKitRequest("Course", "auto", List.of(), 5, 5);
        assertThrows(AiEngineUnavailableException.class, () -> client.generateStudyKit(req));
    }
}
