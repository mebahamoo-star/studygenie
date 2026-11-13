package com.studygenie.backend.dto.admin;

import java.time.LocalDateTime;

public record AdminReportDto(
        Long id,
        Long courseId,
        String courseCode,
        String courseName,
        String universityName,
        Long studentId,
        String studentName,
        String studentEmail,
        String reportedBy,
        String reason,
        String details,
        String description,
        String status,
        String adminNote,
        Long resolvedById,
        String resolvedBy,
        String resolvedByName,
        String resolvedByEmail,
        LocalDateTime resolvedAt,
        LocalDateTime updatedAt,
        LocalDateTime createdAt
) {
    public AdminReportDto(
            Long id,
            Long courseId,
            String courseName,
            String reportedBy,
            String reason,
            String details,
            String status,
            String adminNote,
            Long resolvedById,
            String resolvedBy,
            LocalDateTime resolvedAt,
            LocalDateTime updatedAt,
            LocalDateTime createdAt
    ) {
        this(
                id,
                courseId,
                null,
                courseName,
                null,
                null,
                reportedBy,
                null,
                reportedBy,
                reason,
                details,
                details,
                status,
                adminNote,
                resolvedById,
                resolvedBy,
                resolvedBy,
                resolvedBy,
                resolvedAt,
                updatedAt,
                createdAt
        );
    }
}
