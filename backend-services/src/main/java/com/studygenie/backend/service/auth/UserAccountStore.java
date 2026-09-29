package com.studygenie.backend.service.auth;

import java.util.Optional;

public interface UserAccountStore {
    Optional<UserAccount> findByEmail(String normalizedEmail);
    Optional<UserAccount> findById(Long id);
    boolean existsByEmail(String normalizedEmail);
    java.util.List<UserAccount> findAll();
    UserAccount create(String fullName, String normalizedEmail, String passwordHash);
}

