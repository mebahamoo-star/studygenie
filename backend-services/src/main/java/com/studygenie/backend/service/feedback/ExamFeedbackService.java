package com.studygenie.backend.service.feedback;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.GenerateStudyKitRequest;
import com.studygenie.backend.dto.ai.TopicInput;
import com.studygenie.backend.dto.ai.TopicPlanInput;
import com.studygenie.backend.dto.feedback.CourseFeedbackSummary;
import com.studygenie.backend.dto.feedback.ExamFeedbackPayload;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.ExamFeedback;
import com.studygenie.backend.entity.Syllabus;
import com.studygenie.backend.entity.Topic;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.repository.ExamFeedbackRepository;
import com.studygenie.backend.repository.SyllabusRepository;
import com.studygenie.backend.repository.TopicRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ExamFeedbackService {

    private static final Logger log = LoggerFactory.getLogger(ExamFeedbackService.class);

    private final ExamFeedbackRepository examFeedbackRepository;
    private final CourseRepository courseRepository;
    private final SyllabusRepository syllabusRepository;
    private final TopicRepository topicRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // In-memory fallback used only when instantiated without Spring repositories (unit tests)
    private final Map<String, ExamFeedbackPayload> feedbackStore = new ConcurrentHashMap<>();
    private final Map<String, String> enrollmentCourseMap = new ConcurrentHashMap<>();
    private final Map<String, Long> enrollmentCourseIdMap = new ConcurrentHashMap<>();
    private final Set<String> seenCelebrations = ConcurrentHashMap.newKeySet();

    public ExamFeedbackService() {
        this(null, null, null, null);
    }

    @Autowired
    public ExamFeedbackService(
            ExamFeedbackRepository examFeedbackRepository,
            CourseRepository courseRepository,
            SyllabusRepository syllabusRepository,
            TopicRepository topicRepository) {
        this.examFeedbackRepository = examFeedbackRepository;
        this.courseRepository = courseRepository;
        this.syllabusRepository = syllabusRepository;
        this.topicRepository = topicRepository;
    }

    @Transactional
    public void markCelebrationSeen(String enrollmentId, Long userId) {
        String key = normalizeKey(enrollmentId);
        seenCelebrations.add(key);
        if (examFeedbackRepository != null) {
            examFeedbackRepository.findFirstByEnrollmentKey(key).ifPresent(fb -> {
                fb.setCelebrationSeen(true);
                examFeedbackRepository.save(fb);
            });
        }
        log.info("Marked celebration seen for enrollmentId={} userId={}", enrollmentId, userId);
    }

    public boolean isCelebrationSeen(String enrollmentId) {
        String key = normalizeKey(enrollmentId);
        if (seenCelebrations.contains(key)) {
            return true;
        }
        if (examFeedbackRepository != null) {
            return examFeedbackRepository.findFirstByEnrollmentKey(key)
                    .map(fb -> Boolean.TRUE.equals(fb.getCelebrationSeen()))
                    .orElse(false);
        }
        return false;
    }

    @Transactional
    public void saveFeedback(String enrollmentId, Long userId, ExamFeedbackPayload payload) {
        String key = normalizeKey(enrollmentId);
        seenCelebrations.add(key);

        Long resolvedCourseId = payload.getCourseId();
        if (resolvedCourseId == null) {
            resolvedCourseId = enrollmentCourseIdMap.get(key);
        }
        if (resolvedCourseId == null) {
            resolvedCourseId = tryParseLong(enrollmentId);
        }

        String resolvedCourseName = payload.getCourseName();
        if ((resolvedCourseName == null || resolvedCourseName.isBlank())) {
            resolvedCourseName = enrollmentCourseMap.get(key);
        }
        if ((resolvedCourseName == null || resolvedCourseName.isBlank()) && resolvedCourseId == null) {
            resolvedCourseName = extractCourseFromEnrollment(enrollmentId);
        }

        if (courseRepository != null) {
            if (resolvedCourseId != null && (resolvedCourseName == null || resolvedCourseName.isBlank())) {
                resolvedCourseName = courseRepository.findById(resolvedCourseId)
                        .map(Course::getName)
                        .orElse(resolvedCourseName);
            } else if (resolvedCourseId == null && resolvedCourseName != null && !resolvedCourseName.isBlank()) {
                Optional<Course> found = courseRepository.findFirstByNameIgnoreCase(resolvedCourseName.trim());
                if (found.isPresent()) {
                    resolvedCourseId = found.get().getId();
                    resolvedCourseName = found.get().getName();
                }
            }
        }

        if (resolvedCourseId != null) {
            enrollmentCourseIdMap.put(key, resolvedCourseId);
        }
        if (resolvedCourseName != null && !resolvedCourseName.isBlank()) {
            enrollmentCourseMap.put(key, resolvedCourseName.trim().toLowerCase());
        }

        if (examFeedbackRepository != null) {
            ExamFeedback entity = ExamFeedback.builder()
                    .courseId(resolvedCourseId)
                    .courseName(resolvedCourseName)
                    .enrollmentKey(key)
                    .userId(userId)
                    .difficulty(payload.getDifficulty() != null ? payload.getDifficulty().toUpperCase() : "MEDIUM")
                    .hardTopicIdsJson(writeLongList(payload.getHardTopicIds()))
                    .testedTopicIdsJson(writeLongList(payload.getTestedTopicIds()))
                    .celebrationSeen(true)
                    .build();
            examFeedbackRepository.save(entity);
        } else {
            ExamFeedbackPayload stored = ExamFeedbackPayload.builder()
                    .courseId(resolvedCourseId)
                    .courseName(resolvedCourseName)
                    .difficulty(payload.getDifficulty())
                    .hardTopicIds(payload.getHardTopicIds() != null ? new ArrayList<>(payload.getHardTopicIds()) : new ArrayList<>())
                    .testedTopicIds(payload.getTestedTopicIds() != null ? new ArrayList<>(payload.getTestedTopicIds()) : new ArrayList<>())
                    .build();
            feedbackStore.put(key, stored);
        }

        log.info("Saved post-exam feedback for enrollmentId={}, courseId={}, userId={}, difficulty={}, hardTopics={}, testedTopics={}",
                enrollmentId, resolvedCourseId, userId, payload.getDifficulty(), payload.getHardTopicIds(), payload.getTestedTopicIds());
    }

    public void registerEnrollmentCourse(String enrollmentId, String courseName) {
        if (enrollmentId != null && courseName != null) {
            enrollmentCourseMap.put(normalizeKey(enrollmentId), courseName.trim().toLowerCase());
        }
    }

    public void registerEnrollmentCourse(String enrollmentId, Long courseId, String courseName) {
        String key = normalizeKey(enrollmentId);
        if (courseId != null) {
            enrollmentCourseIdMap.put(key, courseId);
        }
        if (courseName != null) {
            enrollmentCourseMap.put(key, courseName.trim().toLowerCase());
        }
    }

    @Transactional(readOnly = true)
    public CourseFeedbackSummary getFeedbackSummary(Long courseId) {
        if (courseId == null) {
            return emptySummary(null, null);
        }

        String courseName = null;
        if (courseRepository != null) {
            courseName = courseRepository.findById(courseId).map(Course::getName).orElse(null);
        }

        if (examFeedbackRepository != null) {
            List<ExamFeedback> rows = new ArrayList<>(examFeedbackRepository.findByCourseId(courseId));
            if (rows.isEmpty() && courseName != null && !courseName.isBlank()) {
                rows.addAll(examFeedbackRepository.findByCourseNameIgnoreCase(courseName));
            }
            return aggregateFromEntities(courseId, courseName, rows);
        }

        List<ExamFeedbackPayload> matching = new ArrayList<>();
        for (Map.Entry<String, ExamFeedbackPayload> entry : feedbackStore.entrySet()) {
            String enrollKey = entry.getKey();
            ExamFeedbackPayload p = entry.getValue();
            Long mappedId = p.getCourseId() != null ? p.getCourseId() : enrollmentCourseIdMap.get(enrollKey);
            if (courseId.equals(mappedId)) {
                matching.add(p);
            }
        }
        return aggregateFromPayloads(courseId, courseName, matching);
    }

    @Transactional(readOnly = true)
    public CourseFeedbackSummary getFeedbackSummary(String courseNameOrId) {
        if (courseNameOrId == null || courseNameOrId.isBlank()) {
            return emptySummary(null, courseNameOrId);
        }

        Long parsedId = tryParseLong(courseNameOrId);
        if (parsedId != null) {
            return getFeedbackSummary(parsedId);
        }

        String search = courseNameOrId.trim().toLowerCase();
        if (examFeedbackRepository != null) {
            Long resolvedId = null;
            if (courseRepository != null) {
                resolvedId = courseRepository.findFirstByNameIgnoreCase(courseNameOrId.trim())
                        .map(Course::getId)
                        .orElse(null);
            }
            List<ExamFeedback> rows = (resolvedId != null)
                    ? examFeedbackRepository.findByCourseId(resolvedId)
                    : examFeedbackRepository.findByCourseNameIgnoreCase(courseNameOrId.trim());
            return aggregateFromEntities(resolvedId, courseNameOrId, rows);
        }

        List<ExamFeedbackPayload> matching = new ArrayList<>();
        for (Map.Entry<String, ExamFeedbackPayload> entry : feedbackStore.entrySet()) {
            String enrollKey = entry.getKey();
            String mappedCourse = enrollmentCourseMap.get(enrollKey);
            ExamFeedbackPayload p = entry.getValue();
            String payloadCourse = p.getCourseName() != null ? p.getCourseName().trim().toLowerCase() : null;

            boolean matches = (mappedCourse != null && mappedCourse.equals(search))
                    || (payloadCourse != null && payloadCourse.equals(search));

            if (matches) {
                matching.add(p);
            }
        }
        return aggregateFromPayloads(null, courseNameOrId, matching);
    }

    /**
     * Enriches study plan request with student feedback metrics scoped to the course.
     */
    @Transactional(readOnly = true)
    public GeneratePlanRequest enrichPlanRequest(GeneratePlanRequest request, String courseName) {
        return enrichPlanRequest(request, request.getCourseId(), courseName);
    }

    @Transactional(readOnly = true)
    public GeneratePlanRequest enrichPlanRequest(GeneratePlanRequest request, Long courseId, String courseName) {
        Long effectiveCourseId = courseId != null ? courseId : request.getCourseId();
        CourseFeedbackSummary summary = (effectiveCourseId != null)
                ? getFeedbackSummary(effectiveCourseId)
                : getFeedbackSummary(courseName);

        if (summary.getTotalSubmissions() == 0) {
            return request;
        }

        Set<Long> allowedCourseTopicIds = resolveCourseTopicIds(effectiveCourseId);
        Set<Long> testedSet = new HashSet<>(summary.getHeavilyTestedTopicIds());
        Set<Long> hardSet = new HashSet<>(summary.getHardTopicIds());

        if (allowedCourseTopicIds != null) {
            testedSet.retainAll(allowedCourseTopicIds);
            hardSet.retainAll(allowedCourseTopicIds);
        }

        List<TopicPlanInput> enrichedTopics = new ArrayList<>();
        for (TopicPlanInput t : request.topics()) {
            Long topicId = parseNumericTopicRef(t.ref());
            boolean belongsToCourse = topicId != null && (allowedCourseTopicIds == null || allowedCourseTopicIds.contains(topicId));
            boolean isTested = t.isHeavilyTested() || (belongsToCourse && testedSet.contains(topicId));
            boolean isHard = t.isHard() || (belongsToCourse && hardSet.contains(topicId));

            TopicPlanInput enriched = TopicPlanInput.builder()
                    .ref(t.ref())
                    .chapterTitle(t.chapterTitle())
                    .orderIndex(t.orderIndex())
                    .estimatedHours(t.estimatedHours())
                    .importance(t.importance())
                    .subtopics(t.subtopics())
                    .isHeavilyTested(isTested)
                    .isHard(isHard)
                    .build();
            enrichedTopics.add(enriched);
        }

        request.setTopics(enrichedTopics);
        if (request.getCourseDifficulty() == null || request.getCourseDifficulty().isBlank()) {
            request.setCourseDifficulty(summary.getDominantDifficulty());
        }

        return request;
    }

    /**
     * Enriches study kit request with student feedback metrics.
     */
    @Transactional(readOnly = true)
    public GenerateStudyKitRequest enrichStudyKitRequest(GenerateStudyKitRequest request) {
        CourseFeedbackSummary summary = getFeedbackSummary(request.courseName());
        if (summary.getTotalSubmissions() == 0) {
            return request;
        }

        Set<Long> testedSet = new HashSet<>(summary.getHeavilyTestedTopicIds());
        Set<Long> hardSet = new HashSet<>(summary.getHardTopicIds());

        List<TopicInput> enrichedTopics = new ArrayList<>();
        for (TopicInput t : request.topics()) {
            Long topicId = parseNumericTopicRef(t.ref());
            boolean isTested = t.isHeavilyTested() || (topicId != null && testedSet.contains(topicId));
            boolean isHard = t.isHard() || (topicId != null && hardSet.contains(topicId));

            enrichedTopics.add(new TopicInput(
                    t.ref(),
                    t.chapterTitle(),
                    t.subtopics(),
                    t.sourceExcerpt(),
                    isTested,
                    isHard
            ));
        }

        String diff = request.courseDifficulty();
        if (diff == null || diff.isBlank()) {
            diff = summary.getDominantDifficulty();
        }

        return new GenerateStudyKitRequest(
                request.courseName(),
                request.language(),
                enrichedTopics,
                request.flashcardsPerTopic(),
                request.questionsPerTopic(),
                request.quizType(),
                diff
        );
    }

    private Set<Long> resolveCourseTopicIds(Long courseId) {
        if (courseId == null || syllabusRepository == null || topicRepository == null) {
            return null;
        }
        Optional<Syllabus> syl = syllabusRepository.findByCourseId(courseId);
        if (syl.isEmpty()) {
            return Set.of();
        }
        return topicRepository.findBySyllabusId(syl.get().getId()).stream()
                .map(Topic::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private CourseFeedbackSummary emptySummary(Long courseId, String courseName) {
        return CourseFeedbackSummary.builder()
                .courseId(courseId)
                .courseName(courseName)
                .dominantDifficulty("MEDIUM")
                .totalSubmissions(0)
                .build();
    }

    private CourseFeedbackSummary aggregateFromEntities(Long courseId, String courseName, List<ExamFeedback> rows) {
        List<ExamFeedbackPayload> payloads = new ArrayList<>();
        for (ExamFeedback row : rows) {
            payloads.add(ExamFeedbackPayload.builder()
                    .courseId(row.getCourseId())
                    .courseName(row.getCourseName())
                    .difficulty(row.getDifficulty())
                    .testedTopicIds(readLongList(row.getTestedTopicIdsJson()))
                    .hardTopicIds(readLongList(row.getHardTopicIdsJson()))
                    .build());
        }
        return aggregateFromPayloads(courseId, courseName, payloads);
    }

    private CourseFeedbackSummary aggregateFromPayloads(Long courseId, String courseName, List<ExamFeedbackPayload> payloads) {
        if (payloads.isEmpty()) {
            return emptySummary(courseId, courseName);
        }

        Map<String, Integer> diffCounts = new HashMap<>();
        Set<Long> testedIds = new LinkedHashSet<>();
        Set<Long> hardIds = new LinkedHashSet<>();

        for (ExamFeedbackPayload p : payloads) {
            String diff = (p.getDifficulty() != null && !p.getDifficulty().isBlank())
                    ? p.getDifficulty().toUpperCase()
                    : "MEDIUM";
            diffCounts.put(diff, diffCounts.getOrDefault(diff, 0) + 1);
            if (p.getTestedTopicIds() != null) {
                testedIds.addAll(p.getTestedTopicIds());
            }
            if (p.getHardTopicIds() != null) {
                hardIds.addAll(p.getHardTopicIds());
            }
        }

        String dominant = "MEDIUM";
        int maxDiff = -1;
        for (Map.Entry<String, Integer> e : diffCounts.entrySet()) {
            if (e.getValue() > maxDiff) {
                maxDiff = e.getValue();
                dominant = e.getKey();
            }
        }

        return CourseFeedbackSummary.builder()
                .courseId(courseId)
                .courseName(courseName)
                .dominantDifficulty(dominant)
                .totalSubmissions(payloads.size())
                .heavilyTestedTopicIds(new ArrayList<>(testedIds))
                .hardTopicIds(new ArrayList<>(hardIds))
                .difficultyCounts(diffCounts)
                .build();
    }

    private Long parseNumericTopicRef(String ref) {
        if (ref == null || ref.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(ref.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long tryParseLong(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String writeLongList(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(ids);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<Long> readLongList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Long>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private String normalizeKey(String id) {
        return id != null ? id.trim().toLowerCase() : "";
    }

    private String extractCourseFromEnrollment(String id) {
        if (id == null) return null;
        String lower = id.toLowerCase();
        if (lower.startsWith("enroll_")) {
            return lower.substring("enroll_".length());
        }
        return null;
    }
}
