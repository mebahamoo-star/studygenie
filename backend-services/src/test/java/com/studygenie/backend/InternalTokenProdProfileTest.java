package com.studygenie.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {
        "internal.n8n-token=dummy-token-for-test",
        // Dummy DB url to avoid mysql failure during context load
        "spring.datasource.url=jdbc:h2:mem:testdb",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "jwt.secret=dummy-jwt-secret-for-test-must-be-at-least-32-bytes-long"
})
class InternalTokenProdProfileTest {

    @Value("${internal.n8n-token}")
    private String n8nToken;

    @Test
    void contextLoadsWithTokenInDefaultProfile() {
        assertThat(n8nToken).isEqualTo("dummy-token-for-test");
    }
}


