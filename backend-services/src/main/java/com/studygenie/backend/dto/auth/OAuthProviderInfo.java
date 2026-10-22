package com.studygenie.backend.dto.auth;

public record OAuthProviderInfo(
        boolean googleConfigured,
        boolean microsoftConfigured,
        String googleAuthUrl,
        String microsoftAuthUrl
) {
}
