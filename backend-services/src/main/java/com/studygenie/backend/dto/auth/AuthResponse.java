package com.studygenie.backend.dto.auth;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        long refreshExpiresIn,
        UserSummary user
) {
    public AuthResponse(String accessToken, String refreshToken, long expiresIn, long refreshExpiresIn, UserSummary user) {
        this(accessToken, refreshToken, "Bearer", expiresIn, refreshExpiresIn, user);
    }
}
