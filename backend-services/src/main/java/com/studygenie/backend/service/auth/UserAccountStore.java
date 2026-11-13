package com.studygenie.backend.service.auth;

import com.studygenie.backend.entity.enums.AccountStatus;
import com.studygenie.backend.entity.enums.Role;

import java.util.Optional;
import java.util.List;

public interface UserAccountStore {
    Optional<UserAccount> findByEmail(String normalizedEmail);
    Optional<UserAccount> findById(Long id);
    boolean existsByEmail(String normalizedEmail);
    List<UserAccount> findAll();
    UserAccount create(String fullName, String normalizedEmail, String passwordHash);
    UserAccount findOrCreateOAuthUser(String fullName, String normalizedEmail, String provider, String providerId, String avatarUrl);
    void updatePassword(String normalizedEmail, String newPasswordHash);

    default void updateRole(Long userId, Role role) {
    }

    default void updateStatus(Long userId, AccountStatus status) {
    }
}
