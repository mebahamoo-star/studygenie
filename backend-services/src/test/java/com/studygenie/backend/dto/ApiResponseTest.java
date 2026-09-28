package com.studygenie.backend.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ApiResponseTest {

    @Test
    void ok_withData() {
        ApiResponse<String> response = ApiResponse.ok("testData");
        assertTrue(response.isSuccess());
        assertEquals("testData", response.getData());
        assertNull(response.getMessage());
        assertNull(response.getErrors());
        assertNotNull(response.getTimestamp());
    }

    @Test
    void ok_withMessageAndData() {
        ApiResponse<String> response = ApiResponse.ok("Success message", "testData");
        assertTrue(response.isSuccess());
        assertEquals("testData", response.getData());
        assertEquals("Success message", response.getMessage());
        assertNull(response.getErrors());
        assertNotNull(response.getTimestamp());
    }

    @Test
    void error_withMessage() {
        ApiResponse<Void> response = ApiResponse.error("Error occurred");
        assertFalse(response.isSuccess());
        assertNull(response.getData());
        assertEquals("Error occurred", response.getMessage());
        assertNull(response.getErrors());
        assertNotNull(response.getTimestamp());
    }

    @Test
    void error_withMessageAndErrors() {
        List<FieldErrorDetail> errors = Collections.singletonList(new FieldErrorDetail("field", "msg"));
        ApiResponse<Void> response = ApiResponse.error("Validation failed", errors);
        assertFalse(response.isSuccess());
        assertNull(response.getData());
        assertEquals("Validation failed", response.getMessage());
        assertEquals(1, response.getErrors().size());
        assertNotNull(response.getTimestamp());
    }

    @Test
    void jsonSerialization_shouldOmitNullFields() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();
        ApiResponse<String> response = ApiResponse.ok("testData");

        String json = mapper.writeValueAsString(response);

        assertTrue(json.contains("\"success\":true"));
        assertTrue(json.contains("\"data\":\"testData\""));
        assertFalse(json.contains("\"message\""));
        assertFalse(json.contains("\"errors\""));
    }
}
