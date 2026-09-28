package com.studygenie.backend.service.auth;

import java.time.Instant;

public record RefreshTokenRecord(
        Long id,
        Long userId,
        String tokenHash,
        Instant createdAt,
        Instant expiresAt,
        boolean rememberMe,
        boolean revoked
) {
}
