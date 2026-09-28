package com.studygenie.backend.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.nio.charset.StandardCharsets;

@Validated
@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        @NotBlank String secret,
        @NotBlank String issuer,
        @Positive long expirationMs,
        @Positive long refreshExpirationMs,
        @Positive long rememberMeExpirationMs
) {
    public JwtProperties {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT secret must not be blank.");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes.");
        }
        if (expirationMs <= 0 || refreshExpirationMs <= 0 || rememberMeExpirationMs <= 0) {
            throw new IllegalStateException("JWT expirations must be positive.");
        }
    }
}
