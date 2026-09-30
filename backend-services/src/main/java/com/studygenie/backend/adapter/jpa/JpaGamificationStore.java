package com.studygenie.backend.adapter.jpa;

import com.studygenie.backend.dto.gamification.Badge;
import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.dto.gamification.LeaderboardEntry;
import com.studygenie.backend.entity.PointsLedger;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.enums.PointsReason;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.repository.PointsLedgerRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.service.gamification.LevelCalculator;
import com.studygenie.backend.service.port.GamificationStore;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;

@Service
public class JpaGamificationStore implements GamificationStore {

    private final StudentRepository studentRepository;
    private final PointsLedgerRepository pointsLedgerRepository;
    private final LevelCalculator levelCalculator;
    private final Clock clock;
    private final EntityManager entityManager;

    // Preserving in-memory cache alongside otherwise-real persistence for complex collections 
    // to avoid over-engineering DB schema beyond Phase 1/2 spec, as authorized.
    private final ConcurrentHashMap<Long, GamificationProfileExtra> memoryCache = new ConcurrentHashMap<>();

    private record GamificationProfileExtra(
            List<Badge> unlockedBadges,
            Map<ActionType, Integer> dailyXp,
            java.util.Set<String> processedEventIds,
            int longestStreakDays
    ) {
        static GamificationProfileExtra empty() {
            return new GamificationProfileExtra(List.of(), Map.of(), java.util.Set.of(), 0);
        }
    }

    public JpaGamificationStore(StudentRepository studentRepository, 
                                PointsLedgerRepository pointsLedgerRepository, 
                                LevelCalculator levelCalculator, 
                                Clock clock,
                                EntityManager entityManager) {
        this.studentRepository = studentRepository;
        this.pointsLedgerRepository = pointsLedgerRepository;
        this.levelCalculator = levelCalculator;
        this.clock = clock;
        this.entityManager = entityManager;
    }

    @Override
    @Transactional
    public GamificationProfile update(Long userId, UnaryOperator<GamificationProfile> function) {
        Student student = studentRepository.findById(userId).orElseThrow();
        // Relying on database row-level locking to ensure atomicity
        entityManager.lock(student, LockModeType.PESSIMISTIC_WRITE);

        GamificationProfileExtra extra = memoryCache.getOrDefault(userId, GamificationProfileExtra.empty());
        int level = levelCalculator.calculateLevel(student.getGeniePoints());

        GamificationProfile current = new GamificationProfile(
                userId,
                student.getFullName(),
                student.getGeniePoints(),
                level,
                student.getStreakCount(),
                extra.longestStreakDays(),
                student.getLastStudyDate(),
                extra.unlockedBadges(),
                extra.dailyXp(),
                extra.processedEventIds()
        );

        GamificationProfile updated = function.apply(current);

        int pointsAdded = updated.currentXp() - current.currentXp();
        if (pointsAdded != 0) {
            PointsReason reason = deduceReason(current, updated);
            PointsLedger ledger = PointsLedger.create(student, pointsAdded, reason, clock);
            pointsLedgerRepository.save(ledger);
        }

        student.setGeniePoints(updated.currentXp());
        student.setStreakCount(updated.currentStreakDays());
        student.setLastStudyDate(updated.lastActiveDate());
        studentRepository.save(student);

        memoryCache.put(userId, new GamificationProfileExtra(
                updated.unlockedBadges(),
                updated.dailyXp(),
                updated.processedEventIds(),
                updated.longestStreakDays()
        ));

        return updated;
    }

    private PointsReason deduceReason(GamificationProfile oldProfile, GamificationProfile newProfile) {
        for (Map.Entry<ActionType, Integer> entry : newProfile.dailyXp().entrySet()) {
            int oldVal = oldProfile.dailyXp().getOrDefault(entry.getKey(), 0);
            if (entry.getValue() > oldVal) {
                return switch (entry.getKey()) {
                    case QUIZ_PASSED -> PointsReason.TOPIC_QUIZ_PASSED;
                    case FLASHCARDS_REVIEWED -> PointsReason.FLASHCARD_REVIEWED;
                    default -> PointsReason.POMODORO_COMPLETED;
                };
            }
        }
        return PointsReason.POMODORO_COMPLETED; // Fallback
    }

    @Override
    @Transactional(readOnly = true)
    public GamificationProfile getProfile(Long userId) {
        Optional<Student> studentOpt = studentRepository.findById(userId);
        if (studentOpt.isEmpty()) {
            return GamificationProfile.empty(userId);
        }
        Student student = studentOpt.get();
        GamificationProfileExtra extra = memoryCache.getOrDefault(userId, GamificationProfileExtra.empty());
        return new GamificationProfile(
                userId,
                student.getFullName(),
                student.getGeniePoints(),
                levelCalculator.calculateLevel(student.getGeniePoints()),
                student.getStreakCount(),
                extra.longestStreakDays(),
                student.getLastStudyDate(),
                extra.unlockedBadges(),
                extra.dailyXp(),
                extra.processedEventIds()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<LeaderboardEntry> getTop10() {
        return studentRepository.findAll().stream()
                .sorted(Comparator.comparing(Student::getGeniePoints).reversed()
                        .thenComparing(Student::getFullName)
                        .thenComparing(Student::getId))
                .limit(10)
                .map(s -> new LeaderboardEntry(s.getFullName(), s.getGeniePoints(), levelCalculator.calculateLevel(s.getGeniePoints())))
                .collect(Collectors.toList());
    }
}
