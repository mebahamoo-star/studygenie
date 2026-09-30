package com.studygenie.backend.adapter.jpa;

import com.studygenie.backend.dto.gamification.Badge;
import com.studygenie.backend.dto.gamification.GamificationProfile;
import com.studygenie.backend.dto.gamification.LeaderboardEntry;
import com.studygenie.backend.entity.GamificationEventLog;
import com.studygenie.backend.entity.PointsLedger;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.StudentBadge;
import com.studygenie.backend.entity.enums.PointsReason;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.repository.GamificationEventLogRepository;
import com.studygenie.backend.repository.PointsLedgerRepository;
import com.studygenie.backend.repository.StudentBadgeRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.service.gamification.GamificationService;
import com.studygenie.backend.service.gamification.LevelCalculator;
import com.studygenie.backend.service.port.GamificationStore;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.UnaryOperator;
import java.util.stream.Collectors;

@Service
public class JpaGamificationStore implements GamificationStore {

    private final StudentRepository studentRepository;
    private final PointsLedgerRepository pointsLedgerRepository;
    private final GamificationEventLogRepository eventLogRepository;
    private final StudentBadgeRepository studentBadgeRepository;
    private final LevelCalculator levelCalculator;
    private final Clock clock;
    private final EntityManager entityManager;

    public JpaGamificationStore(StudentRepository studentRepository, 
                                PointsLedgerRepository pointsLedgerRepository, 
                                GamificationEventLogRepository eventLogRepository,
                                StudentBadgeRepository studentBadgeRepository,
                                LevelCalculator levelCalculator, 
                                Clock clock,
                                EntityManager entityManager) {
        this.studentRepository = studentRepository;
        this.pointsLedgerRepository = pointsLedgerRepository;
        this.eventLogRepository = eventLogRepository;
        this.studentBadgeRepository = studentBadgeRepository;
        this.levelCalculator = levelCalculator;
        this.clock = clock;
        this.entityManager = entityManager;
    }

    @Override
    @Transactional
    public GamificationProfile update(Long userId, UnaryOperator<GamificationProfile> function) {
        Student student = entityManager.find(Student.class, userId, LockModeType.PESSIMISTIC_WRITE);
        if (student == null) {
            throw new com.studygenie.backend.exception.ResourceNotFoundException("Student not found: " + userId);
        }

        String eventId = GamificationService.currentEventId.get();
        if (eventId != null && eventLogRepository.existsByStudentIdAndEventId(userId, eventId)) {
            return buildProfile(student);
        }

        GamificationProfile current = buildProfile(student);
        GamificationProfile updated = function.apply(current);

        if (updated == current) {
            return current;
        }

        int pointsAdded = updated.currentXp() - current.currentXp();
        if (pointsAdded != 0) {
            PointsReason reason = deduceReason(current, updated);
            PointsLedger ledger = PointsLedger.create(student, pointsAdded, reason, clock);
            pointsLedgerRepository.save(ledger);

            if (eventId != null) {
                ActionType currentAction = null;
                for (Map.Entry<ActionType, Integer> entry : updated.dailyXp().entrySet()) {
                    int oldVal = current.dailyXp().getOrDefault(entry.getKey(), 0);
                    if (entry.getValue() > oldVal) {
                        currentAction = entry.getKey();
                        break;
                    }
                }
                
                GamificationEventLog logEvent = new GamificationEventLog();
                logEvent.setStudent(student);
                logEvent.setEventId(eventId);
                logEvent.setActionType(currentAction);
                logEvent.setPointsAwarded(pointsAdded);
                eventLogRepository.save(logEvent);
            }
        }

        student.setGeniePoints(updated.currentXp());
        student.setStreakCount(updated.currentStreakDays());
        student.setLongestStreakDays(updated.longestStreakDays());
        student.setLastStudyDate(updated.lastActiveDate());
        studentRepository.save(student);

        Set<String> oldBadges = current.unlockedBadges().stream().map(Badge::id).collect(Collectors.toSet());
        for (Badge b : updated.unlockedBadges()) {
            if (!oldBadges.contains(b.id())) {
                StudentBadge newBadge = new StudentBadge();
                newBadge.setStudent(student);
                newBadge.setBadgeId(b.id());
                newBadge.setName(b.name());
                newBadge.setDescription(b.description());
                newBadge.setUnlockedAt(b.unlockedAt());
                studentBadgeRepository.save(newBadge);
            }
        }

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
        return buildProfile(studentOpt.get());
    }

    private GamificationProfile buildProfile(Student student) {
        LocalDateTime startOfDay = LocalDate.now(clock).atStartOfDay();
        List<GamificationEventLog> todayEvents = eventLogRepository.findByStudentIdAndCreatedAtAfter(student.getId(), startOfDay);
        
        Map<ActionType, Integer> dailyXp = new EnumMap<>(ActionType.class);
        for (GamificationEventLog e : todayEvents) {
            if (e.getActionType() != null) {
                dailyXp.merge(e.getActionType(), e.getPointsAwarded(), Integer::sum);
            }
        }
        
        List<Badge> badges = studentBadgeRepository.findByStudentId(student.getId()).stream()
                .map(sb -> new Badge(sb.getBadgeId(), sb.getName(), sb.getDescription(), sb.getUnlockedAt()))
                .collect(Collectors.toList());
                
        int level = levelCalculator.calculateLevel(student.getGeniePoints());
        
        return new GamificationProfile(
                student.getId(),
                student.getFullName(),
                student.getGeniePoints(),
                level,
                student.getStreakCount(),
                student.getLongestStreakDays(),
                student.getLastStudyDate(),
                badges,
                dailyXp,
                Set.of() // In-memory processedEventIds no longer used
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
