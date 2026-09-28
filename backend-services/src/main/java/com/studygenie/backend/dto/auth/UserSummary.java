package com.studygenie.backend.dto.auth;

public record UserSummary(
        Long id,
        String fullName,
        String email
) {
}
