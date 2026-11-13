package com.studygenie.backend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.dto.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Sliding/fixed window rate limiter for sensitive authentication and admin endpoints.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;

    private final ObjectMapper objectMapper;
    private final int authMaxRequestsPerMinute;
    private final int adminMaxRequestsPerMinute;
    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

    public RateLimitingFilter(
            ObjectMapper objectMapper,
            @Value("${app.rate-limit.auth-per-minute:60}") int authMaxRequestsPerMinute,
            @Value("${app.rate-limit.admin-per-minute:180}") int adminMaxRequestsPerMinute) {
        this.objectMapper = objectMapper;
        this.authMaxRequestsPerMinute = authMaxRequestsPerMinute;
        this.adminMaxRequestsPerMinute = adminMaxRequestsPerMinute;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI() != null ? request.getRequestURI() : "";
        boolean isSensitiveAuth = uri.equals("/api/auth/login")
                || uri.equals("/api/auth/register")
                || uri.equals("/api/auth/refresh")
                || uri.equals("/api/auth/forgot-password")
                || uri.equals("/api/auth/reset-password")
                || uri.equals("/api/auth/oauth/login");
        boolean isAdmin = uri.startsWith("/api/admin");

        if (!isSensitiveAuth && !isAdmin) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = resolveClientIp(request);
        String bucket = isAdmin ? "admin:" + clientIp : "auth:" + clientIp;
        int limit = isAdmin ? adminMaxRequestsPerMinute : authMaxRequestsPerMinute;

        if (!allowRequest(bucket, limit)) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", "60");
            ApiResponse<Void> body = ApiResponse.error("Too many requests. Please try again later.", "RATE_LIMITED");
            objectMapper.writeValue(response.getOutputStream(), body);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean allowRequest(String key, int maxRequests) {
        long now = System.currentTimeMillis();
        WindowCounter counter = counters.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart >= WINDOW_MS) {
                return new WindowCounter(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });
        return counter.count.get() <= maxRequests;
    }

    public void resetAll() {
        counters.clear();
    }

    private String resolveClientIp(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        return (remote != null && !remote.isBlank()) ? remote : "unknown";
    }

    private record WindowCounter(long windowStart, AtomicInteger count) {}
}
