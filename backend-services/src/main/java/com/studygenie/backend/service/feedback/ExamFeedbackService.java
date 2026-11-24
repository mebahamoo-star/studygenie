package com.studygenie.backend.service.feedback;

import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.GenerateStudyKitRequest;
import com.studygenie.backend.dto.ai.TopicInput;
import com.studygenie.backend.dto.ai.TopicPlanInput;
import com.studygenie.backend.dto.feedback.CourseFeedbackSummary;
import com.studygenie.backend.dto.feedback.ExamFeedbackPayload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ExamFeedbackService {

    private static final Logger log = LoggerFactory.getLogger(ExamFeedbackService.class);

    // enrollmentId -> ExamFeedbackPayload
    private final Map<String, ExamFeedbackPayload> feedbackStore = new ConcurrentHashMap<>();
    
    // enrollmentId -> courseName
    private final Map<String, String> enrollmentCourseMap = new ConcurrentHashMap<>();

    // celebrationSeen: enrollmentId -> Boolean
    private final Set<String> seenCelebrations = ConcurrentHashMap.newKeySet();

    public void markCelebrationSeen(String enrollmentId, Long userId) {
        seenCelebrations.add(normalizeKey(enrollmentId));
        log.info("Marked celebration seen for enrollmentId={} userId={}", enrollmentId, userId);
    }

    public boolean isCelebrationSeen(String enrollmentId) {
        return seenCelebrations.contains(normalizeKey(enrollmentId));
    }

    public void saveFeedback(String enrollmentId, Long userId, ExamFeedbackPayload payload) {
        String key = normalizeKey(enrollmentId);
        feedbackStore.put(key, payload);
        seenCelebrations.add(key);

        // Inferred course name from enrollmentId if structured like "enroll_cs305" or "CS 305"
        String parsedCourse = extractCourseFromEnrollment(enrollmentId);
        if (parsedCourse != null) {
            enrollmentCourseMap.put(key, parsedCourse);
        }

        log.info("Saved post-exam feedback for enrollmentId={}, userId={}, difficulty={}, hardTopics={}, testedTopics={}",
                enrollmentId, userId, payload.getDifficulty(), payload.getHardTopicIds(), payload.getTestedTopicIds());
    }

    public void registerEnrollmentCourse(String enrollmentId, String courseName) {
        if (enrollmentId != null && courseName != null) {
            enrollmentCourseMap.put(normalizeKey(enrollmentId), courseName.trim().toLowerCase());
        }
    }

    public CourseFeedbackSummary getFeedbackSummary(String courseName) {
        if (courseName == null || courseName.isBlank()) {
            return CourseFeedbackSummary.builder()
                    .courseName(courseName)
                    .dominantDifficulty("MEDIUM")
                    .totalSubmissions(0)
                    .build();
        }

        String search = courseName.trim().toLowerCase();
        Map<String, Integer> diffCounts = new HashMap<>();
        Map<Long, Integer> testedFrequency = new HashMap<>();
        Map<Long, Integer> hardFrequency = new HashMap<>();
        int count = 0;

        for (Map.Entry<String, ExamFeedbackPayload> entry : feedbackStore.entrySet()) {
            String enrollKey = entry.getKey();
            String mappedCourse = enrollmentCourseMap.get(enrollKey);

            boolean matches = (mappedCourse != null && (mappedCourse.contains(search) || search.contains(mappedCourse)))
                    || enrollKey.contains(search);

            if (matches || feedbackStore.size() == 1) { // If only 1 or matches
                count++;
                ExamFeedbackPayload p = entry.getValue();
                String diff = (p.getDifficulty() != null) ? p.getDifficulty().toUpperCase() : "MEDIUM";
                diffCounts.put(diff, diffCounts.getOrDefault(diff, 0) + 1);

                if (p.getTestedTopicIds() != null) {
                    for (Long tId : p.getTestedTopicIds()) {
                        testedFrequency.put(tId, testedFrequency.getOrDefault(tId, 0) + 1);
                    }
                }
                if (p.getHardTopicIds() != null) {
                    for (Long hId : p.getHardTopicIds()) {
                        hardFrequency.put(hId, hardFrequency.getOrDefault(hId, 0) + 1);
                    }
                }
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
                .courseName(courseName)
                .dominantDifficulty(dominant)
                .totalSubmissions(count)
                .heavilyTestedTopicIds(new ArrayList<>(testedFrequency.keySet()))
                .hardTopicIds(new ArrayList<>(hardFrequency.keySet()))
                .difficultyCounts(diffCounts)
                .build();
    }

    /**
     * Enriches study plan request with student feedback metrics
     */
    public GeneratePlanRequest enrichPlanRequest(GeneratePlanRequest request, String courseName) {
        CourseFeedbackSummary summary = getFeedbackSummary(courseName);
        if (summary.getTotalSubmissions() == 0) {
            return request;
        }

        Set<Long> testedSet = new HashSet<>(summary.getHeavilyTestedTopicIds());
        Set<Long> hardSet = new HashSet<>(summary.getHardTopicIds());

        List<TopicPlanInput> enrichedTopics = new ArrayList<>();
        for (TopicPlanInput t : request.topics()) {
            Long topicId = parseTopicRef(t.ref(), t.orderIndex());
            boolean isTested = t.isHeavilyTested() || (topicId != null && testedSet.contains(topicId));
            boolean isHard = t.isHard() || (topicId != null && hardSet.contains(topicId));

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
     * Enriches study kit request with student feedback metrics
     */
    public GenerateStudyKitRequest enrichStudyKitRequest(GenerateStudyKitRequest request) {
        CourseFeedbackSummary summary = getFeedbackSummary(request.courseName());
        if (summary.getTotalSubmissions() == 0) {
            return request;
        }

        Set<Long> testedSet = new HashSet<>(summary.getHeavilyTestedTopicIds());
        Set<Long> hardSet = new HashSet<>(summary.getHardTopicIds());

        List<TopicInput> enrichedTopics = new ArrayList<>();
        int idx = 1;
        for (TopicInput t : request.topics()) {
            Long topicId = parseTopicRef(t.ref(), idx++);
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

    private Long parseTopicRef(String ref, int fallbackOrder) {
        if (ref != null) {
            try {
                return Long.parseLong(ref.replaceAll("\\D+", ""));
            } catch (NumberFormatException ignored) {}
        }
        return (long) fallbackOrder;
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
        return lower;
    }
}
