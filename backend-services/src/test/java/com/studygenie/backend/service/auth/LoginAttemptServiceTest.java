package com.studygenie.backend.service.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.*;

class LoginAttemptServiceTest {

    private LoginAttemptService loginAttemptService;
    private AdjustableClock clock;

    static class AdjustableClock extends Clock {
        private Instant instant;

        AdjustableClock(Instant instant) {
            this.instant = instant;
        }

        @Override
        public ZoneId getZone() { return ZoneId.of("UTC"); }
        @Override
        public Clock withZone(ZoneId zone) { return this; }
        @Override
        public Instant instant() { return instant; }
        public void advance(long millis) { this.instant = this.instant.plusMillis(millis); }
    }

    @BeforeEach
    void setUp() {
        clock = new AdjustableClock(Instant.parse("2023-01-01T00:00:00Z"));
        loginAttemptService = new LoginAttemptService(3, 15, clock); // 3 max attempts, 15 min window
    }

    @Test
    void testRateLimiterBlocksAndUnblocks() {
        String key = "test@example.com|127.0.0.1";
        
        assertFalse(loginAttemptService.isBlocked(key));
        
        loginAttemptService.loginFailed(key);
        loginAttemptService.loginFailed(key);
        assertFalse(loginAttemptService.isBlocked(key));
        
        loginAttemptService.loginFailed(key);
        assertTrue(loginAttemptService.isBlocked(key));
        
        // Wait 15 minutes + 1 ms
        clock.advance(15 * 60_000 + 1);
        
        // Should be unblocked
        assertFalse(loginAttemptService.isBlocked(key));
    }

    @Test
    void testSuccessClearsAttempts() {
        String key = "test2@example.com|127.0.0.1";
        
        loginAttemptService.loginFailed(key);
        loginAttemptService.loginFailed(key);
        assertFalse(loginAttemptService.isBlocked(key));
        
        loginAttemptService.loginSucceeded(key);
        loginAttemptService.loginFailed(key);
        loginAttemptService.loginFailed(key);
        assertFalse(loginAttemptService.isBlocked(key));
    }
}
