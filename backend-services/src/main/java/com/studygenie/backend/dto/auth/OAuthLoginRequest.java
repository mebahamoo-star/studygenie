package com.studygenie.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record OAuthLoginRequest(
        @NotBlank String provider,
        String code,
        String idToken,
        String redirectUri
) {
}
