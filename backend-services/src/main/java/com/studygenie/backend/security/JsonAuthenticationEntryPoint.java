package com.studygenie.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.dto.ApiResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Handles 401 Unauthorized errors and returns a JSON response.
 */
@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public JsonAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException, ServletException {
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        String errorAttr = (String) request.getAttribute("auth.error");
        String message = "TOKEN_EXPIRED".equals(errorAttr) ? "Token expired" : "Unauthorized";

        ApiResponse<Void> apiResponse = ApiResponse.error(message);
        objectMapper.writeValue(response.getOutputStream(), apiResponse);
    }
}
