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
@AutoConfigureMockMvc(addFilters = false) // Disable security filters to test the exception handler directly
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
        // name is null

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
}
