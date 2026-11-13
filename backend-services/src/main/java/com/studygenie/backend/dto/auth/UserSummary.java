package com.studygenie.backend.dto.auth;

public record UserSummary(
        Long id,
        String fullName,
        String email,
        String role,
        String status
) {
    public UserSummary {
        role = (role != null && !role.isBlank()) ? role : "STUDENT";
        status = (status != null && !status.isBlank()) ? status : "ACTIVE";
    }

    public UserSummary(Long id, String fullName, String email) {
        this(id, fullName, email, "STUDENT", "ACTIVE");
    }

    public UserSummary(Long id, String fullName, String email, String role) {
        this(id, fullName, email, role, "ACTIVE");
    }
}
