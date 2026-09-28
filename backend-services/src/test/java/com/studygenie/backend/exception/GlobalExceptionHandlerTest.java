package com.studygenie.backend.exception;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.controller.TestExceptionController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("dev")
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void handleResourceNotFoundException() throws Exception {
        mockMvc.perform(get("/api/test-exception/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Test not found"));
    }

    @Test
    void handleMethodArgumentNotValidException() throws Exception {
        TestExceptionController.DummyRequest request = new TestExceptionController.DummyRequest();
        mockMvc.perform(post("/api/test-exception/validation")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors[0].field").value("name"))
                .andExpect(jsonPath("$.errors[0].message").value("Name is required"));
    }

    @Test
    void handleAccessDeniedException() throws Exception {
        mockMvc.perform(get("/api/test-exception/access-denied"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void handleAuthenticationException() throws Exception {
        mockMvc.perform(get("/api/test-exception/auth"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void handleGenericException() throws Exception {
        mockMvc.perform(get("/api/test-exception/generic"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"));
    }

    @Test
    void handleTypeMismatchException() throws Exception {
        mockMvc.perform(get("/api/test-exception/type-mismatch?id=abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Parameter type mismatch: id"));
    }

    @Test
    void handleHttpRequestMethodNotSupportedException() throws Exception {
        mockMvc.perform(delete("/api/test-exception/not-found"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Method not supported: DELETE"));
    }

    @Test
    void handleNoResourceFoundException() throws Exception {
        mockMvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Resource not found"));
    }

    @Test
    void handleHttpMediaTypeNotSupportedException() throws Exception {
        mockMvc.perform(post("/api/test-exception/media-type")
                .contentType(MediaType.TEXT_PLAIN)
                .content("hello"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unsupported media type"));
    }

    @Test
    void handleHttpMediaTypeNotAcceptableException() throws Exception {
        mockMvc.perform(get("/api/test-exception/not-acceptable")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotAcceptable())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Not acceptable"));
    }

    @Test
    void handleHandlerMethodValidationException() throws Exception {
        mockMvc.perform(get("/api/test-exception/method-validation?param=1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors[0].field").value("param"));
    }

    @Test
    void handleMissingServletRequestPartException() throws Exception {
        mockMvc.perform(multipart("/api/test-exception/missing-part"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Missing request part: file"));
    }

    @Test
    void handleMissingPathVariableException() throws Exception {
        mockMvc.perform(get("/api/test-exception/missing-path"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Missing path variable: id"));
    }

    @Test
    void handleConstraintViolationException() throws Exception {
        mockMvc.perform(get("/api/test-exception/constraint"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                // Expect that the leaked string "createUser.arg0 leaked" is NOT in the message
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("leaked"))));
    }

    @Test
    void handleClassLevelValidationException() throws Exception {
        mockMvc.perform(get("/api/test-exception/class-validation"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors[0].field").value("dummyRequest"))
                .andExpect(jsonPath("$.errors[0].message").value("Class level error"));
    }
}
