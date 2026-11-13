package com.studygenie.backend.service.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.dto.admin.AdminAuditLogDto;
import com.studygenie.backend.dto.admin.AdminPageResponse;
import com.studygenie.backend.entity.AdminAuditLog;
import com.studygenie.backend.repository.AdminAuditLogRepository;
import com.studygenie.backend.security.AuthenticatedUser;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class AdminAuditService {

    private static final Logger log = LoggerFactory.getLogger(AdminAuditService.class);
    private static final int MAX_SUMMARY_LENGTH = 3900;

    private final AdminAuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AdminAuditService(AdminAuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AdminAuditLog record(
            AuthenticatedUser actor,
            String action,
            String targetType,
            Object targetId,
            Object beforeState,
            Object afterState,
            HttpServletRequest request) {

        Long adminId = actor != null && actor.id() != null ? actor.id() : 0L;
        String adminEmail = actor != null && actor.email() != null ? actor.email() : "system";
        String ip = request != null ? truncate(request.getRemoteAddr(), 80) : null;
        String userAgent = request != null ? truncate(request.getHeader("User-Agent"), 500) : null;

        AdminAuditLog entry = AdminAuditLog.builder()
                .adminId(adminId)
                .adminEmail(truncate(adminEmail, 150))
                .action(truncate(action, 100))
                .targetType(truncate(targetType, 80))
                .targetId(targetId != null ? truncate(String.valueOf(targetId), 100) : null)
                .beforeSummary(toJsonSafely(beforeState))
                .afterSummary(toJsonSafely(afterState))
                .ip(ip)
                .userAgent(userAgent)
                .build();

        return auditLogRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public AdminPageResponse<AdminAuditLogDto> getAuditLogs(
            Long adminId,
            String action,
            String targetType,
            String search,
            int page,
            int size) {

        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));

        Specification<AdminAuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (adminId != null) {
                predicates.add(cb.equal(root.get("adminId"), adminId));
            }
            if (action != null && !action.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("action")), action.trim().toUpperCase(Locale.ROOT)));
            }
            if (targetType != null && !targetType.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("targetType")), targetType.trim().toUpperCase(Locale.ROOT)));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("adminEmail")), pattern),
                        cb.like(cb.lower(root.get("action")), pattern),
                        cb.like(cb.lower(root.get("targetType")), pattern),
                        cb.like(cb.lower(root.get("targetId")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AdminAuditLog> result = auditLogRepository.findAll(
                spec,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt", "id"))
        );

        List<AdminAuditLogDto> items = result.getContent().stream()
                .map(this::toDto)
                .toList();

        return new AdminPageResponse<>(
                items,
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    private AdminAuditLogDto toDto(AdminAuditLog logEntry) {
        return new AdminAuditLogDto(
                logEntry.getId(),
                logEntry.getAdminId(),
                logEntry.getAdminEmail(),
                logEntry.getAction(),
                logEntry.getTargetType(),
                logEntry.getTargetId(),
                logEntry.getBeforeSummary(),
                logEntry.getAfterSummary(),
                logEntry.getIp(),
                logEntry.getUserAgent(),
                logEntry.getCreatedAt()
        );
    }

    private String toJsonSafely(Object value) {
        if (value == null) {
            return null;
        }
        try {
            String json = (value instanceof String str) ? str : objectMapper.writeValueAsString(value);
            return truncate(json, MAX_SUMMARY_LENGTH);
        } catch (Exception ex) {
            log.debug("Failed to serialize audit state: {}", ex.getMessage());
            return truncate(String.valueOf(value), MAX_SUMMARY_LENGTH);
        }
    }

    private String truncate(String s, int maxLen) {
        if (s == null) {
            return null;
        }
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }
}
