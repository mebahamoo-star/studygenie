package com.studygenie.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("dev")
public class JwtPropertiesDevTest {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Test
    void devJwtSecretShouldNotContainInlineComments() {
        System.out.println("RESOLVED JWT SECRET: [" + jwtSecret + "]");
        assertThat(jwtSecret)
                .isNotEmpty()
                .doesNotContain("#")
                .doesNotContain("DEV ONLY")
                .isEqualTo("dev-only-not-a-secret-change-me-in-any-real-environment-0123456789");
    }
}
