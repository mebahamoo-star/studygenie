package com.studygenie.backend.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Fails fast on startup in non-dev/non-test profiles if required secrets are missing
 * or using insecure placeholder values. Never logs secret values.
 */
@Component
@Profile("!dev & !test")
public class ProductionSecretsValidator {

    private final String datasourceUrl;
    private final String datasourcePassword;
    private final String jwtSecret;
    private final String aiInternalToken;
    private final String n8nInternalToken;

    public ProductionSecretsValidator(
            @Value("${spring.datasource.url:}") String datasourceUrl,
            @Value("${spring.datasource.password:}") String datasourcePassword,
            @Value("${jwt.secret:}") String jwtSecret,
            @Value("${ai-engine.internal-token:}") String aiInternalToken,
            @Value("${internal.n8n-token:}") String n8nInternalToken) {
        this.datasourceUrl = datasourceUrl != null ? datasourceUrl.trim() : "";
        this.datasourcePassword = datasourcePassword != null ? datasourcePassword.trim() : "";
        this.jwtSecret = jwtSecret != null ? jwtSecret.trim() : "";
        this.aiInternalToken = aiInternalToken != null ? aiInternalToken.trim() : "";
        this.n8nInternalToken = n8nInternalToken != null ? n8nInternalToken.trim() : "";
    }

    @PostConstruct
    public void validateRequiredSecrets() {
        List<String> missingOrWeak = new ArrayList<>();

        boolean isInMemoryH2 = datasourceUrl.startsWith("jdbc:h2:mem:");
        if (!isInMemoryH2 && datasourcePassword.isEmpty()) {
            missingOrWeak.add("DB_PASS (spring.datasource.password)");
        }

        if (jwtSecret.isEmpty()
                || "super_secret_jwt_key_that_is_long_enough_for_hs256_algorithm".equals(jwtSecret)) {
            missingOrWeak.add("JWT_SECRET (jwt.secret)");
        }

        if (aiInternalToken.isEmpty()
                || "changeme_to_at_least_16_chars_long".equals(aiInternalToken)) {
            missingOrWeak.add("AI_INTERNAL_TOKEN (ai-engine.internal-token)");
        }

        if (n8nInternalToken.isEmpty()) {
            missingOrWeak.add("INTERNAL_N8N_TOKEN (internal.n8n-token)");
        }

        if (!missingOrWeak.isEmpty()) {
            throw new IllegalStateException(
                    "Startup aborted: required secrets are missing or using default placeholders in non-dev profile: "
                            + String.join(", ", missingOrWeak)
                            + ". Set these environment variables before starting the server (or activate the 'dev' profile for local development)."
            );
        }
    }
}
