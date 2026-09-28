package com.studygenie.backend.service.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Service to limit login attempts.
 * NOTE: This is an in-memory implementation suitable for a single instance.
 * For production with multiple instances, a shared store like Redis should be used.
 */
@Service
public class LoginAttemptService {

    private final Map<String, List<Instant>> attemptsCache = new ConcurrentHashMap<>();
    
    private final int maxAttempts;
    private final long windowMillis;
    private final Clock clock;

    public LoginAttemptService(
            @Value("${auth.login.max-attempts:5}") int maxAttempts,
            @Value("${auth.login.window-minutes:15}") int windowMinutes,
            Clock clock) {
        this.maxAttempts = maxAttempts;
        this.windowMillis = windowMinutes * 60_000L;
        this.clock = clock;
    }

    public boolean isBlocked(String key) {
        cleanOldAttempts(key);
        List<Instant> attempts = attemptsCache.get(key);
        return attempts != null && attempts.size() >= maxAttempts;
    }

    public void loginFailed(String key) {
        cleanOldAttempts(key);
        attemptsCache.computeIfAbsent(key, k -> new CopyOnWriteArrayList<>()).add(clock.instant());
    }

    public void loginSucceeded(String key) {
        attemptsCache.remove(key);
    }

    private void cleanOldAttempts(String key) {
        List<Instant> attempts = attemptsCache.get(key);
        if (attempts != null) {
            Instant threshold = clock.instant().minusMillis(windowMillis);
            attempts.removeIf(instant -> instant.isBefore(threshold));
            if (attempts.isEmpty()) {
                attemptsCache.remove(key);
            }
        }
    }
}
