package com.studygenie.backend.service.port;

import com.studygenie.backend.dto.ai.ParseResponseData;
import com.studygenie.backend.dto.ai.TopicItem;
import com.studygenie.backend.entity.College;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.Syllabus;
import com.studygenie.backend.entity.Topic;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.repository.CollegeRepository;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.repository.SyllabusRepository;
import com.studygenie.backend.repository.TopicRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@Primary
public class JpaSyllabusResultStore implements SyllabusResultStore {

    private static final Logger log = LoggerFactory.getLogger(JpaSyllabusResultStore.class);

    private final CourseRepository courseRepository;
    private final CollegeRepository collegeRepository;
    private final SyllabusRepository syllabusRepository;
    private final TopicRepository topicRepository;

    public JpaSyllabusResultStore(CourseRepository courseRepository,
                                  CollegeRepository collegeRepository,
                                  SyllabusRepository syllabusRepository,
                                  TopicRepository topicRepository) {
        this.courseRepository = courseRepository;
        this.collegeRepository = collegeRepository;
        this.syllabusRepository = syllabusRepository;
        this.topicRepository = topicRepository;
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
                        : (data.courseTitle() != null ? data.courseTitle() : "My Course");
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

        // Fetch existing topics for this syllabus to append rather than overwrite
        List<Topic> existingTopics = topicRepository.findBySyllabusId(syllabus.getId());
        java.util.Set<String> existingTitles = existingTopics.stream()
                .map(t -> t.getChapterTitle().trim().toLowerCase())
                .collect(java.util.stream.Collectors.toSet());

        int nextOrder = existingTopics.stream()
                .mapToInt(Topic::getOrderIndex)
                .max()
                .orElse(0) + 1;

        // Save new topics, making titles unique if collisions occur rather than dropping
        int addedCount = 0;
        for (TopicItem item : data.topics()) {
            if (item.chapterTitle() == null || item.chapterTitle().isBlank()) {
                continue;
            }
            String finalTitle = item.chapterTitle().trim();
            int counter = 2;
            while (existingTitles.contains(finalTitle.toLowerCase())) {
                finalTitle = item.chapterTitle().trim() + " (Part " + counter + ")";
                counter++;
            }
            double hrs = item.estimatedHours() > 0 ? item.estimatedHours() : 2.0;
            Topic topic = Topic.builder()
                    .syllabus(syllabus)
                    .chapterTitle(finalTitle)
                    .orderIndex(nextOrder++)
                    .estimatedHours(hrs)
                    .contentExcerpt(item.contentExcerpt())
                    .build();
            topicRepository.save(topic);
            existingTitles.add(finalTitle.toLowerCase());
            addedCount++;
        }

        // Update Course Status to READY
        course.setStatus(CourseStatus.READY);
        courseRepository.save(course);
        log.info("Successfully persisted {} new topics (total: {}) for course '{}' (ID: {}). Status set to READY.",
                addedCount, existingTopics.size() + addedCount, course.getName(), course.getId());
    }
}
