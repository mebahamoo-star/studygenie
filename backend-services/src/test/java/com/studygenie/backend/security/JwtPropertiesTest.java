package com.studygenie.backend.security;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

class JwtPropertiesTest {

    @Test
    void validProperties() {
        new JwtProperties("01234567890123456789012345678912", "iss", 1000, 1000, 1000);
    }

    @Test
    void blankSecretThrowsException() {
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> 
            new JwtProperties("", "iss", 1000, 1000, 1000)
        );
        assertTrue(exception.getMessage().contains("must not be blank"));
        assertFalse(exception.getMessage().contains("secret_value")); // Ensure no leak
    }

    @Test
    void shortSecretThrowsException() {
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> 
            new JwtProperties("short", "iss", 1000, 1000, 1000)
        );
        assertTrue(exception.getMessage().contains("at least 32 bytes"));
        assertFalse(exception.getMessage().contains("short")); // Ensure no leak
    }
}
