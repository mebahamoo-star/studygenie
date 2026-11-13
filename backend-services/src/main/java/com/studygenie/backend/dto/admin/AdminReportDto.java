package com.studygenie.backend.dto.admin;

import java.time.LocalDateTime;

public record AdminReportDto(
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
}
