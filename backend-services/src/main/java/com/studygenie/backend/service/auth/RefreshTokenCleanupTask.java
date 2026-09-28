package com.studygenie.backend.service.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;

@Component
public class RefreshTokenCleanupTask {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenCleanupTask.class);
    
    private final RefreshTokenStore refreshTokenStore;
    private final Clock clock;

    public RefreshTokenCleanupTask(RefreshTokenStore refreshTokenStore, Clock clock) {
        this.refreshTokenStore = refreshTokenStore;
        this.clock = clock;
    }

    @Scheduled(cron = "${auth.refresh.cleanup-cron:0 0 0 * * ?}")
    public void deleteExpiredTokens() {
        int deleted = refreshTokenStore.deleteExpired(clock.instant());
        if (deleted > 0) {
            log.info("Deleted {} expired refresh tokens", deleted);
        }
    }
}
