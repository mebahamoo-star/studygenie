package com.studygenie.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.dto.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class InternalAuthFilter extends OncePerRequestFilter {

    private final String n8nToken;
    private final ObjectMapper objectMapper;
    public static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    public InternalAuthFilter(@Value("${internal.n8n-token}") String n8nToken, ObjectMapper objectMapper) {
        this.n8nToken = n8nToken;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/internal/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = request.getHeader(INTERNAL_TOKEN_HEADER);
        if (token == null || !isEqualConstantTime(token, n8nToken)) {
            sendError(response, HttpStatus.UNAUTHORIZED.value(), "Missing or invalid internal token");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isEqualConstantTime(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private void sendError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiResponse<Void> apiResponse = ApiResponse.error(message);
        objectMapper.writeValue(response.getOutputStream(), apiResponse);
    }
}

