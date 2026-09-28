package com.studygenie.backend.controller;

import com.studygenie.backend.dto.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Health check controller.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final String appName;

    public HealthController(@Value("${spring.application.name:backend}") String appName) {
        this.appName = appName;
    }

    @GetMapping
    public ApiResponse<Map<String, Object>> getHealth() {
        Map<String, Object> data = new HashMap<>();
        data.put("status", "UP");
        data.put("application", appName);
        data.put("time", Instant.now().toString());

        return ApiResponse.ok(data);
    }
}
