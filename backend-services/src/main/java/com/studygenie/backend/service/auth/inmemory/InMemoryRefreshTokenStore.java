package com.studygenie.backend.service.auth.inmemory;

import com.studygenie.backend.service.auth.RefreshTokenRecord;
import com.studygenie.backend.service.auth.RefreshTokenStore;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class InMemoryRefreshTokenStore implements RefreshTokenStore {

    private final Map<Long, RefreshTokenRecord> tokensById = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);

    @Override
    public RefreshTokenRecord save(RefreshTokenRecord r) {
        long id = r.id() == null ? idGenerator.getAndIncrement() : r.id();
        RefreshTokenRecord saved = new RefreshTokenRecord(
                id, r.userId(), r.tokenHash(), r.createdAt(), r.expiresAt(), r.rememberMe(), r.revoked()
        );
        tokensById.put(id, saved);
        return saved;
    }

    @Override
    public Optional<RefreshTokenRecord> findByTokenHash(String hash) {
        return tokensById.values().stream()
                .filter(t -> t.tokenHash().equals(hash))
                .findFirst();
    }

    @Override
    public void revoke(Long id) {
        RefreshTokenRecord existing = tokensById.get(id);
        if (existing != null && !existing.revoked()) {
            tokensById.put(id, new RefreshTokenRecord(
                    existing.id(), existing.userId(), existing.tokenHash(),
                    existing.createdAt(), existing.expiresAt(), existing.rememberMe(), true
            ));
        }
    }

    @Override
    public void revokeAllForUser(Long userId) {
        tokensById.values().stream()
                .filter(t -> t.userId().equals(userId) && !t.revoked())
                .forEach(t -> revoke(t.id()));
    }

    @Override
    public int deleteExpired(Instant now) {
        int count = 0;
        for (Map.Entry<Long, RefreshTokenRecord> entry : tokensById.entrySet()) {
            if (entry.getValue().expiresAt().isBefore(now)) {
                tokensById.remove(entry.getKey());
                count++;
            }
        }
        return count;
    }
}
