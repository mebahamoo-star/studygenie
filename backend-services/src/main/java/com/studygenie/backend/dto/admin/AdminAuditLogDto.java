package com.studygenie.backend.dto.admin;

import java.time.LocalDateTime;

public record AdminAuditLogDto(
        Long id,
        Long adminId,
        String adminEmail,
        String action,
        String targetType,
        String targetId,
        String beforeSummary,
        String afterSummary,
        String ip,
        String userAgent,
        LocalDateTime createdAt
) {
}
