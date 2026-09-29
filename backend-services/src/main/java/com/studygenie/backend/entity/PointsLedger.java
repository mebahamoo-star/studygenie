package com.studygenie.backend.entity;

import com.studygenie.backend.entity.enums.PointsReason;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.Clock;
import java.time.LocalDateTime;

@Entity
@Table(name = "points_ledger")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PointsLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @NotNull
    @Column(name = "points", nullable = false)
    private Integer points;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 30)
    private PointsReason reason;

    @NotNull
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static PointsLedger create(Student student, int points, PointsReason reason, Clock clock) {
        return new PointsLedger(null, student, points, reason, LocalDateTime.now(clock));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PointsLedger)) return false;
        PointsLedger that = (PointsLedger) o;
        return id != null && id.equals(that.getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
