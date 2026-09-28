package com.studygenie.backend.service.auth;

import java.time.Instant;

public record UserAccount(
        Long id,
        String fullName,
        String email,
        String passwordHash,
        Instant createdAt
) {
}
