package com.studygenie.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "admin_audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_id", nullable = false, updatable = false)
    private Long adminId;

    @Column(name = "admin_email", length = 150, updatable = false)
    private String adminEmail;

    @Column(name = "action", nullable = false, length = 100, updatable = false)
    private String action;

    @Column(name = "target_type", nullable = false, length = 80, updatable = false)
    private String targetType;

    @Column(name = "target_id", length = 100, updatable = false)
    private String targetId;

    @Column(name = "before_summary", length = 4000, updatable = false)
    private String beforeSummary;

    @Column(name = "after_summary", length = 4000, updatable = false)
    private String afterSummary;

    @Column(name = "ip", length = 80, updatable = false)
    private String ip;

    @Column(name = "user_agent", length = 512, updatable = false)
    private String userAgent;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
