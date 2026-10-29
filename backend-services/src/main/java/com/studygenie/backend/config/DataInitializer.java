package com.studygenie.backend.config;

import com.studygenie.backend.entity.College;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.Syllabus;
import com.studygenie.backend.entity.Topic;
import com.studygenie.backend.entity.University;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.repository.CollegeRepository;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.repository.SyllabusRepository;
import com.studygenie.backend.repository.TopicRepository;
import com.studygenie.backend.repository.UniversityRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UniversityRepository universityRepository;
    private final CollegeRepository collegeRepository;
    private final CourseRepository courseRepository;
    private final SyllabusRepository syllabusRepository;
    private final TopicRepository topicRepository;

    public DataInitializer(UniversityRepository universityRepository,
                           CollegeRepository collegeRepository,
                           CourseRepository courseRepository,
                           SyllabusRepository syllabusRepository,
                           TopicRepository topicRepository) {
        this.universityRepository = universityRepository;
        this.collegeRepository = collegeRepository;
        this.courseRepository = courseRepository;
        this.syllabusRepository = syllabusRepository;
        this.topicRepository = topicRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (universityRepository.count() > 0) {
            log.info("Database already seeded with universities. Skipping data initialization.");
            return;
        }

        log.info("Seeding initial universities, colleges, and courses into cloud database...");

        // 1. King Saud University
        University ksu = universityRepository.save(University.builder().name("King Saud University").build());
        College ccis = collegeRepository.save(College.builder().name("College of Computer and Information Sciences").university(ksu).build());
        collegeRepository.save(College.builder().name("College of Engineering").university(ksu).build());
        collegeRepository.save(College.builder().name("College of Business Administration").university(ksu).build());

        // 2. Stanford University
        University stanford = universityRepository.save(University.builder().name("Stanford University").build());
        College stanfordEng = collegeRepository.save(College.builder().name("School of Engineering").university(stanford).build());

        // Seed sample ready courses for CCIS
        createCourseWithTopics(ccis, "CS 101 - Introduction to Programming", List.of(
                new TopicData("Variables and Data Types", 2.0),
                new TopicData("Control Flow and Loops", 3.0),
                new TopicData("Functions and Modularity", 2.5),
                new TopicData("Object-Oriented Basics", 3.5)
        ));

        createCourseWithTopics(ccis, "CS 214 - Data Structures and Algorithms", List.of(
                new TopicData("Arrays and Linked Lists", 2.0),
                new TopicData("Stacks, Queues, and Deques", 2.5),
                new TopicData("Trees and Binary Search Trees", 4.0),
                new TopicData("Graphs and Graph Algorithms", 4.5),
                new TopicData("Sorting and Searching Complexity", 3.0)
        ));

        createCourseWithTopics(ccis, "MATH 101 - Calculus I", List.of(
                new TopicData("Limits and Continuity", 3.0),
                new TopicData("Derivatives and Differentiation Rules", 4.0),
                new TopicData("Applications of Derivatives", 3.5),
                new TopicData("Integrals and Fundamental Theorem", 4.0)
        ));

        createCourseWithTopics(ccis, "SWE 312 - Software Engineering Fundamentals", List.of(
                new TopicData("Agile Methodologies and Scrum", 2.0),
                new TopicData("Requirements Engineering and User Stories", 3.0),
                new TopicData("Architectural Design and Patterns", 3.5),
                new TopicData("Testing and Quality Assurance", 2.5)
        ));

        // Sample for Stanford
        createCourseWithTopics(stanfordEng, "CS 106A - Programming Methodology", List.of(
                new TopicData("Problem Solving with Code", 2.5),
                new TopicData("Data Structures in Practice", 3.0),
                new TopicData("Memory and References", 3.5)
        ));

        log.info("Data initialization complete. Seeded universities, colleges, and sample catalog courses.");
    }

    private void createCourseWithTopics(College college, String name, List<TopicData> topics) {
        Course course = Course.builder()
                .name(name)
                .college(college)
                .status(CourseStatus.READY)
                .build();
        course = courseRepository.save(course);

        Syllabus syllabus = Syllabus.builder()
                .course(course)
                .createdAt(LocalDateTime.now())
                .build();
        syllabus = syllabusRepository.save(syllabus);

        course.setSyllabus(syllabus);
        courseRepository.save(course);

        int order = 1;
        for (TopicData td : topics) {
            Topic topic = Topic.builder()
                    .syllabus(syllabus)
                    .chapterTitle(td.title())
                    .estimatedHours(td.hours())
                    .orderIndex(order++)
                    .build();
            topicRepository.save(topic);
        }
    }

    private record TopicData(String title, Double hours) {}
}
