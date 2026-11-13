package com.studygenie.backend.service.auth;

import com.studygenie.backend.entity.enums.AccountStatus;
import com.studygenie.backend.entity.enums.Role;

import java.time.Instant;

public record UserAccount(
        Long id,
        String fullName,
        String email,
        String passwordHash,
        Instant createdAt,
        Role role,
        AccountStatus status
) {
    public UserAccount {
        role = role != null ? role : Role.STUDENT;
        status = status != null ? status : AccountStatus.ACTIVE;
    }

    public UserAccount(Long id, String fullName, String email, String passwordHash, Instant createdAt) {
        this(id, fullName, email, passwordHash, createdAt, Role.STUDENT, AccountStatus.ACTIVE);
    }
}
