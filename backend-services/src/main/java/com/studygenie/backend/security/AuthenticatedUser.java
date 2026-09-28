package com.studygenie.backend.security;

public record AuthenticatedUser(
        Long id,
        String email
) {
}
