package com.studygenie.backend.service.auth.inmemory;

import com.studygenie.backend.exception.DuplicateResourceException;
import com.studygenie.backend.service.auth.UserAccount;
import com.studygenie.backend.service.auth.UserAccountStore;

import java.time.Clock;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class InMemoryUserAccountStore implements UserAccountStore {

    private final Map<Long, UserAccount> usersById = new ConcurrentHashMap<>();
    private final Map<String, UserAccount> usersByEmail = new ConcurrentHashMap<>();
    private final AtomicLong idGenerator = new AtomicLong(1);
    private final Clock clock;

    public InMemoryUserAccountStore(Clock clock) {
        this.clock = clock;
    }

    @Override
    public Optional<UserAccount> findByEmail(String normalizedEmail) {
        return Optional.ofNullable(usersByEmail.get(normalizedEmail));
    }

    @Override
    public Optional<UserAccount> findById(Long id) {
        return Optional.ofNullable(usersById.get(id));
    }

    @Override
    public boolean existsByEmail(String normalizedEmail) {
        return usersByEmail.containsKey(normalizedEmail);
    }

    @Override
    public UserAccount create(String fullName, String normalizedEmail, String passwordHash) {
        long id = idGenerator.getAndIncrement();
        UserAccount user = new UserAccount(id, fullName, normalizedEmail, passwordHash, clock.instant());
        
        // Atomically put if absent to prevent duplicates
        UserAccount existing = usersByEmail.putIfAbsent(normalizedEmail, user);
        if (existing != null) {
            throw new DuplicateResourceException("Email already exists");
        }
        
        usersById.put(id, user);
        return user;
    }
}
