package com.studygenie.backend.service.port;

import com.studygenie.backend.dto.ai.FlashcardDto;
import com.studygenie.backend.dto.ai.ParseResponseData;
import com.studygenie.backend.dto.ai.TopicItem;
import com.studygenie.backend.entity.College;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.Flashcard;
import com.studygenie.backend.entity.Syllabus;
import com.studygenie.backend.entity.Topic;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.repository.CollegeRepository;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.repository.FlashcardRepository;
import com.studygenie.backend.repository.SyllabusRepository;
import com.studygenie.backend.repository.TopicRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@Primary
public class JpaSyllabusResultStore implements SyllabusResultStore {

    private static final Logger log = LoggerFactory.getLogger(JpaSyllabusResultStore.class);

    private final CourseRepository courseRepository;
    private final CollegeRepository collegeRepository;
    private final SyllabusRepository syllabusRepository;
    private final TopicRepository topicRepository;
    private final FlashcardRepository flashcardRepository;

    public JpaSyllabusResultStore(CourseRepository courseRepository,
                                  CollegeRepository collegeRepository,
                                  SyllabusRepository syllabusRepository,
                                  TopicRepository topicRepository,
                                  FlashcardRepository flashcardRepository) {
        this.courseRepository = courseRepository;
        this.collegeRepository = collegeRepository;
        this.syllabusRepository = syllabusRepository;
        this.topicRepository = topicRepository;
        this.flashcardRepository = flashcardRepository;
    }

    @Override
    @Transactional
    public void save(Long courseId, String courseName, ParseResponseData data) {
        if (data == null || data.topics() == null || data.topics().isEmpty()) {
            log.warn("No topics in ParseResponseData to save.");
            return;
        }

        Course course = null;
        if (courseId != null) {
            course = courseRepository.findById(courseId).orElse(null);
        }
        if (course == null && courseName != null && !courseName.isBlank()) {
            course = courseRepository.findFirstByNameIgnoreCase(courseName.trim()).orElse(null);
        }
        if (course == null) {
            College college = collegeRepository.findById(1L)
                    .orElseGet(() -> {
                        List<College> all = collegeRepository.findAll();
                        return all.isEmpty() ? null : all.get(0);
                    });

            if (college != null) {
                String name = (courseName != null && !courseName.isBlank())
                        ? courseName.trim()
                        : data.getEffectiveCourseTitle();
                course = Course.builder()
                        .name(name)
                        .college(college)
                        .status(CourseStatus.READY)
                        .createdAt(LocalDateTime.now())
                        .build();
                course = courseRepository.save(course);
                log.info("Created new course '{}' (ID: {}) for parsed syllabus", course.getName(), course.getId());
            } else {
                log.error("Cannot save syllabus: No college found in database.");
                return;
            }
        }

        // Find or create Syllabus
        Syllabus syllabus = syllabusRepository.findByCourseId(course.getId()).orElse(null);
        if (syllabus == null) {
            syllabus = Syllabus.builder()
                    .course(course)
                    .createdAt(LocalDateTime.now())
                    .build();
            syllabus = syllabusRepository.save(syllabus);
        }

        // Fetch existing topics for this syllabus to avoid duplicate chapters
        List<Topic> existingTopics = topicRepository.findBySyllabusId(syllabus.getId());
        Set<String> existingTitles = existingTopics.stream()
                .map(t -> normalizeChapterTitle(t.getChapterTitle()))
                .filter(s -> !s.isBlank())
                .collect(Collectors.toSet());

        int nextOrder = existingTopics.stream()
                .mapToInt(Topic::getOrderIndex)
                .max()
                .orElse(0) + 1;

        // Save new topics, strictly deduplicating identical chapters
        int addedCount = 0;
        List<Topic> savedTopics = new ArrayList<>();

        for (TopicItem item : data.topics()) {
            String title = item.getEffectiveTitle();
            if (title == null || title.isBlank()) {
                continue;
            }
            String rawTitle = title.trim().replaceAll("(?i)\\s*\\(part\\s*\\d+\\)$", "").trim();
            String normKey = normalizeChapterTitle(rawTitle);

            // If a chapter with the same concept/title already exists in the syllabus, DO NOT duplicate!
            if (existingTitles.contains(normKey)) {
                log.info("Syllabus chapter '{}' already exists for course '{}'. Skipping duplicate.", rawTitle, course.getName());
                continue;
            }

            double hrs = item.estimatedHours() > 0 ? item.estimatedHours() : 2.0;
            Topic topic = Topic.builder()
                    .syllabus(syllabus)
                    .chapterTitle(rawTitle)
                    .orderIndex(nextOrder++)
                    .estimatedHours(hrs)
                    .contentExcerpt(item.contentExcerpt())
                    .build();
            Topic saved = topicRepository.save(topic);
            savedTopics.add(saved);
            existingTitles.add(normKey);
            addedCount++;
        }

        // Save high-yield flashcards returned from the structured Gemini call (strictly capped at 10 max)
        List<Topic> allAvailableTopics = new ArrayList<>(existingTopics);
        allAvailableTopics.addAll(savedTopics);

        if (data.flashcards() != null && !data.flashcards().isEmpty() && !allAvailableTopics.isEmpty()) {
            int cardsAdded = 0;
            List<FlashcardDto> cardsToSave = data.flashcards().stream()
                    .filter(fc -> fc.question() != null && !fc.question().isBlank())
                    .limit(10)
                    .toList();

            for (FlashcardDto fc : cardsToSave) {
                Topic matchedTopic = findMatchingTopic(allAvailableTopics, fc.topicTag());
                if (matchedTopic == null) continue;
                String answer = (fc.answer() != null && !fc.answer().isBlank()) ? fc.answer().trim() : "Key concept";
                Flashcard card = Flashcard.builder()
                        .topic(matchedTopic)
                        .frontText(fc.question().trim())
                        .backText(answer)
                        .build();
                flashcardRepository.save(card);
                cardsAdded++;
            }
            log.info("Successfully persisted {} high-yield study flashcards for course '{}'", cardsAdded, course.getName());
        }

        // Update Course Status to READY
        course.setStatus(CourseStatus.READY);
        courseRepository.save(course);
        log.info("Successfully persisted {} new topics (total: {}) for course '{}' (ID: {}). Status set to READY.",
                addedCount, existingTopics.size() + addedCount, course.getName(), course.getId());
    }

    private Topic findMatchingTopic(List<Topic> topics, String topicTag) {
        if (topics.isEmpty()) return null;
        if (topicTag != null && !topicTag.isBlank()) {
            String normTag = normalizeChapterTitle(topicTag);
            for (Topic t : topics) {
                if (normalizeChapterTitle(t.getChapterTitle()).contains(normTag) ||
                        normTag.contains(normalizeChapterTitle(t.getChapterTitle()))) {
                    return t;
                }
            }
        }
        return topics.get(0);
    }

    private String normalizeChapterTitle(String title) {
        if (title == null) return "";
        return title
                .replaceAll("(?i)\\s*\\(part\\s*\\d+\\)$", "")
                .replaceAll("(?i)^chapter\\s*\\d+[:\\s.-]*", "")
                .trim()
                .toLowerCase();
    }
}
