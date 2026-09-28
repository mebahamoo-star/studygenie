package com.studygenie.backend.service.auth;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenStore {
    RefreshTokenRecord save(RefreshTokenRecord r);
    Optional<RefreshTokenRecord> findByTokenHash(String hash);
    void revoke(Long id);
    void revokeAllForUser(Long userId);
    int deleteExpired(Instant now);
}
