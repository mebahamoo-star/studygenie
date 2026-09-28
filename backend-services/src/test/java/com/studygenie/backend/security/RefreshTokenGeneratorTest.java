package com.studygenie.backend.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RefreshTokenGeneratorTest {

    private final RefreshTokenGenerator generator = new RefreshTokenGenerator();

    @Test
    void testTokenGeneration() {
        String token1 = generator.generateToken();
        String token2 = generator.generateToken();

        assertNotNull(token1);
        assertNotNull(token2);
        assertNotEquals(token1, token2);
        assertTrue(token1.length() >= 43); // 32 bytes base64url encoded is 43 chars
        assertFalse(token1.contains("=")); // no padding
        assertFalse(token1.contains("+"));
        assertFalse(token1.contains("/"));
    }

    @Test
    void testTokenHashing() {
        String token = "my-secret-token";
        String hash = generator.hashToken(token);

        assertNotNull(hash);
        assertEquals(64, hash.length()); // SHA-256 is 32 bytes, hex is 64 chars
        assertNotEquals(token, hash);
        assertEquals(hash, generator.hashToken(token)); // deterministic
    }
}
