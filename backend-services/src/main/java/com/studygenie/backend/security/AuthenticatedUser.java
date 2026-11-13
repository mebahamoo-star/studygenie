package com.studygenie.backend.security;

import com.studygenie.backend.entity.enums.Role;

public record AuthenticatedUser(
        Long id,
        String email,
        Role role
) {
    public AuthenticatedUser {
        role = role != null ? role : Role.STUDENT;
    }

    public AuthenticatedUser(Long id, String email) {
        this(id, email, Role.STUDENT);
    }
}
