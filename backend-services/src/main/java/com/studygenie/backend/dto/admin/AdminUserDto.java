package com.studygenie.backend.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Admin user view DTO projection.
 * Deliberately excludes password hashes, refresh tokens, and internal secrets.
 */
public record AdminUserDto(
        Long id,
        String fullName,
        String email,
        String role,
        String status,
        Long universityId,
        String universityName,
        String authProvider,
        long enrolledCoursesCount,
        int geniePoints,
        int streakCount,
        int longestStreakDays,
        LocalDate lastStudyDate,
        LocalDateTime lastActiveAt,
        LocalDateTime createdAt
) {
    public record UpdateRoleRequest(
            @NotBlank
            @Size(max = 30)
            String role
    ) {}

    public record UpdateStatusRequest(
            @NotBlank
            @Size(max = 30)
            String status
    ) {}
}
