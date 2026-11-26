package com.studygenie.backend.service.browse;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.PlanResponseData;
import com.studygenie.backend.dto.ai.PlanSummary;
import com.studygenie.backend.dto.ai.SkippedTopic;
import com.studygenie.backend.dto.ai.Task;
import com.studygenie.backend.dto.ai.TopicPlanInput;
import com.studygenie.backend.dto.browse.CourseDto;
import com.studygenie.backend.dto.syllabus.TopicDto;
import com.studygenie.backend.entity.College;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.Exam;
import com.studygenie.backend.repository.ExamRepository;
import com.studygenie.backend.entity.Flashcard;
import com.studygenie.backend.entity.FlashcardReview;
import com.studygenie.backend.entity.PlanTask;
import com.studygenie.backend.entity.QuizAttempt;
import com.studygenie.backend.entity.QuizQuestion;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.StudyPlan;
import com.studygenie.backend.entity.Syllabus;
import com.studygenie.backend.entity.Topic;
import com.studygenie.backend.entity.University;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.exception.BadRequestException;
import com.studygenie.backend.exception.DuplicateResourceException;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.exception.ResourceNotReadyException;
import com.studygenie.backend.repository.CollegeRepository;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.repository.FlashcardRepository;
import com.studygenie.backend.repository.FlashcardReviewRepository;
import com.studygenie.backend.repository.PlanTaskRepository;
import com.studygenie.backend.repository.QuizAttemptRepository;
import com.studygenie.backend.repository.QuizQuestionRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.repository.StudyPlanRepository;
import com.studygenie.backend.repository.SyllabusRepository;
import com.studygenie.backend.repository.TopicRepository;
import com.studygenie.backend.repository.UniversityRepository;
import com.studygenie.backend.service.ai.StudyPlanService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CourseService {

    private final java.util.Map<String, CachedCourses> coursesCache = new java.util.concurrent.ConcurrentHashMap<>();
    private record CachedCourses(long timestamp, List<CourseDto> list) {}


    private static final Logger log = LoggerFactory.getLogger(CourseService.class);

    private final CourseRepository courseRepository;
    private final CollegeRepository collegeRepository;
    private final UniversityRepository universityRepository;
    private final StudentRepository studentRepository;
    private final StudyPlanRepository studyPlanRepository;
    private final PlanTaskRepository planTaskRepository;
    private final StudyPlanService studyPlanService;
    private final TopicRepository topicRepository;
    private final SyllabusRepository syllabusRepository;
    private final FlashcardRepository flashcardRepository;
    private final FlashcardReviewRepository flashcardReviewRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final ExamRepository examRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CourseService(CourseRepository courseRepository,
                         CollegeRepository collegeRepository,
                         UniversityRepository universityRepository,
                         StudentRepository studentRepository,
                         StudyPlanRepository studyPlanRepository,
                         PlanTaskRepository planTaskRepository,
                         StudyPlanService studyPlanService,
                         TopicRepository topicRepository,
                         SyllabusRepository syllabusRepository,
                         FlashcardRepository flashcardRepository,
                         FlashcardReviewRepository flashcardReviewRepository,
                         QuizQuestionRepository quizQuestionRepository,
                         QuizAttemptRepository quizAttemptRepository,
                         ExamRepository examRepository) {
        this.courseRepository = courseRepository;
        this.collegeRepository = collegeRepository;
        this.universityRepository = universityRepository;
        this.studentRepository = studentRepository;
        this.studyPlanRepository = studyPlanRepository;
        this.planTaskRepository = planTaskRepository;
        this.studyPlanService = studyPlanService;
        this.topicRepository = topicRepository;
        this.syllabusRepository = syllabusRepository;
        this.flashcardRepository = flashcardRepository;
        this.flashcardReviewRepository = flashcardReviewRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.examRepository = examRepository;
    }

    public void clearCoursesCache() {
        coursesCache.clear();
    }

    @Transactional(readOnly = true)
    public List<CourseDto> getAllCourses() {
        CachedCourses cached = coursesCache.get("all");
        if (cached != null && (System.currentTimeMillis() - cached.timestamp() < 30_000)) {
            return cached.list();
        }
        List<CourseDto> list = courseRepository.findAll().stream()
                .filter(c -> c.getDeletedAt() == null)
                .map(c -> new CourseDto(c.getId(), c.getName(), c.getCollege() != null ? c.getCollege().getId() : null, c.getStatus()))
                .collect(Collectors.toList());
        coursesCache.put("all", new CachedCourses(System.currentTimeMillis(), list));
        return list;
    }

    @Transactional(readOnly = true)
    public List<CourseDto> getCoursesByCollege(Long collegeId) {
        if (collegeId == null) {
            return getAllCourses();
        }
        String key = "col_" + collegeId;
        CachedCourses cached = coursesCache.get(key);
        if (cached != null && (System.currentTimeMillis() - cached.timestamp() < 30_000)) {
            return cached.list();
        }
        List<CourseDto> list = courseRepository.findByCollegeId(collegeId).stream()
                .filter(c -> c.getDeletedAt() == null)
                .map(c -> new CourseDto(c.getId(), c.getName(), c.getCollege() != null ? c.getCollege().getId() : null, c.getStatus()))
                .collect(Collectors.toList());
        coursesCache.put(key, new CachedCourses(System.currentTimeMillis(), list));
        return list;
    }

    @Transactional(readOnly = true)
    public List<CourseDto> getMyCourses(Long studentId) {
        Set<Course> courses = new HashSet<>();

        studentRepository.findById(studentId).ifPresent(student -> {
            if (student.getEnrolledCourses() != null) {
                courses.addAll(student.getEnrolledCourses());
            }
        });

        List<StudyPlan> plans = studyPlanRepository.findByStudentId(studentId);
        for (StudyPlan plan : plans) {
            if (plan.getCourse() != null) {
                courses.add(plan.getCourse());
            }
        }

        return courses.stream()
                .filter(c -> c.getDeletedAt() == null)
                .map(c -> new CourseDto(c.getId(), c.getName(), c.getCollege() != null ? c.getCollege().getId() : null, c.getStatus()))
                .collect(Collectors.toList());
    }

    @Transactional
    public CourseDto enrollCourse(Long studentId, Long courseId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (student.getEnrolledCourses() == null) {
            student.setEnrolledCourses(new HashSet<>());
        }
        student.getEnrolledCourses().add(course);
        studentRepository.save(student);

        return new CourseDto(course.getId(), course.getName(), course.getCollege() != null ? course.getCollege().getId() : null, course.getStatus());
    }

    @Transactional
    public void unenrollCourse(Long studentId, Long courseId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
        if (student.getEnrolledCourses() != null) {
            student.getEnrolledCourses().removeIf(c -> c.getId().equals(courseId));
            studentRepository.save(student);
        }

        // Clean up only this student's personal study plan for the course,
        // leaving the shared course, syllabus, topics, and other students intact.
        studyPlanRepository.findByStudentIdAndCourseId(studentId, courseId).ifPresent(plan -> {
            List<PlanTask> tasks = planTaskRepository.findByStudyPlanId(plan.getId());
            if (!tasks.isEmpty()) {
                planTaskRepository.deleteAll(tasks);
            }
            studyPlanRepository.delete(plan);
        });
    }

    @Transactional
    public List<CourseDto> syncEnrolledCourses(Long studentId, List<String> courseIdentifiers) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (student.getEnrolledCourses() == null) {
            student.setEnrolledCourses(new HashSet<>());
        }

        if (courseIdentifiers != null && !courseIdentifiers.isEmpty()) {
            List<Course> allCourses = courseRepository.findAll();
            for (String idOrName : courseIdentifiers) {
                if (idOrName == null || idOrName.trim().isEmpty()) continue;
                String trimmed = idOrName.trim();
                Course foundCourse = null;
                try {
                    Long cId = Long.parseLong(trimmed);
                    foundCourse = courseRepository.findById(cId).orElse(null);
                } catch (NumberFormatException ignored) {
                }

                if (foundCourse == null) {
                    foundCourse = allCourses.stream()
                            .filter(c -> c.getName() != null && c.getName().equalsIgnoreCase(trimmed))
                            .findFirst()
                            .orElse(null);
                }

                if (foundCourse == null) {
                    try {
                        CourseDto created = createCourse(null, trimmed);
                        foundCourse = courseRepository.findById(created.id()).orElse(null);
                        allCourses = courseRepository.findAll();
                    } catch (Exception e) {
                        log.warn("Could not auto-create course '{}': {}", trimmed, e.getMessage());
                    }
                }

                if (foundCourse != null) {
                    student.getEnrolledCourses().add(foundCourse);
                }
            }
            studentRepository.save(student);
        }

        return getMyCourses(studentId);
    }

    @Transactional(readOnly = true)
    public CourseDto getCourse(Long courseId) {
        Course c = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        return new CourseDto(c.getId(), c.getName(), c.getCollege() != null ? c.getCollege().getId() : null, c.getStatus());
    }

    @Transactional(readOnly = true)
    public List<TopicDto> getCourseTopics(Long courseId) {
        Course c = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        if (c.getStatus() == CourseStatus.NO_SYLLABUS || c.getSyllabus() == null) {
            throw new ResourceNotFoundException("This course has no syllabus yet.", "NO_SYLLABUS");
        }
        if (c.getStatus() != CourseStatus.READY) {
            throw new ResourceNotReadyException("Course syllabus is not ready yet.", "SYLLABUS_NOT_READY");
        }
        List<Topic> allTopics = topicRepository.findBySyllabusId(c.getSyllabus().getId());
        java.util.Map<String, Topic> uniqueMap = new java.util.LinkedHashMap<>();
        for (Topic t : allTopics) {
            String norm = t.getChapterTitle() == null ? "" : t.getChapterTitle()
                    .replaceAll("(?i)\\s*\\(part\\s*\\d+\\)$", "")
                    .replaceAll("(?i)^chapter\\s*\\d+[:\\s.-]*", "")
                    .trim()
                    .toLowerCase();
            if (!uniqueMap.containsKey(norm)) {
                uniqueMap.put(norm, t);
            }
        }
        return uniqueMap.values().stream()
                .map(t -> new TopicDto(
                        t.getId(),
                        t.getChapterTitle().replaceAll("(?i)\\s*\\(part\\s*\\d+\\)$", "").trim(),
                        t.getOrderIndex(),
                        t.getEstimatedHours(),
                        t.getContentExcerpt()))
                .collect(Collectors.toList());
    }

    @Transactional
    public TopicDto addTopic(Long courseId, String chapterTitle, Double estimatedHours) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        Syllabus syllabus = course.getSyllabus();
        if (syllabus == null) {
            syllabus = syllabusRepository.findByCourseId(course.getId()).orElse(null);
            if (syllabus == null) {
                syllabus = Syllabus.builder()
                        .course(course)
                        .createdAt(LocalDateTime.now())
                        .build();
                syllabus = syllabusRepository.save(syllabus);
            }
            course.setSyllabus(syllabus);
        }

        List<Topic> existingTopics = topicRepository.findBySyllabusId(syllabus.getId());
        String normIncoming = chapterTitle.trim()
                .replaceAll("(?i)\\s*\\(part\\s*\\d+\\)$", "")
                .replaceAll("(?i)^chapter\\s*\\d+[:\\s.-]*", "")
                .toLowerCase();
        for (Topic et : existingTopics) {
            String normEt = et.getChapterTitle() == null ? "" : et.getChapterTitle()
                    .replaceAll("(?i)\\s*\\(part\\s*\\d+\\)$", "")
                    .replaceAll("(?i)^chapter\\s*\\d+[:\\s.-]*", "")
                    .toLowerCase();
            if (normEt.equals(normIncoming)) {
                return new TopicDto(et.getId(), et.getChapterTitle(), et.getOrderIndex(), et.getEstimatedHours(), et.getContentExcerpt());
            }
        }
        int nextOrder = existingTopics.stream()
                .mapToInt(Topic::getOrderIndex)
                .max()
                .orElse(0) + 1;

        double hrs = (estimatedHours != null && estimatedHours >= 0.5) ? estimatedHours : 2.0;

        Topic topic = Topic.builder()
                .syllabus(syllabus)
                .chapterTitle(chapterTitle.trim())
                .orderIndex(nextOrder)
                .estimatedHours(hrs)
                .build();
        topic = topicRepository.save(topic);

        course.setStatus(CourseStatus.READY);
        courseRepository.save(course);

        return new TopicDto(topic.getId(), topic.getChapterTitle(), topic.getOrderIndex(), topic.getEstimatedHours());
    }

    @Transactional
    public void deleteTopicCascade(Topic topic) {
        if (topic == null || topic.getId() == null) return;
        Long topicId = topic.getId();

        try {
            List<QuizQuestion> questions = quizQuestionRepository.findByTopicId(topicId);
            for (QuizQuestion q : questions) {
                List<QuizAttempt> attempts = quizAttemptRepository.findByQuestionId(q.getId());
                if (!attempts.isEmpty()) {
                    quizAttemptRepository.deleteAll(attempts);
                }
            }
            if (!questions.isEmpty()) {
                quizQuestionRepository.deleteAll(questions);
            }
        } catch (Exception e) {
            log.warn("Error deleting quiz questions/attempts for topic {}: {}", topicId, e.getMessage());
        }

        try {
            List<Flashcard> cards = flashcardRepository.findByTopicId(topicId);
            for (Flashcard f : cards) {
                List<FlashcardReview> reviews = flashcardReviewRepository.findByFlashcardId(f.getId());
                if (!reviews.isEmpty()) {
                    flashcardReviewRepository.deleteAll(reviews);
                }
            }
            if (!cards.isEmpty()) {
                flashcardRepository.deleteAll(cards);
            }
        } catch (Exception e) {
            log.warn("Error deleting flashcards/reviews for topic {}: {}", topicId, e.getMessage());
        }

        try {
            List<PlanTask> tasks = planTaskRepository.findByTopicId(topicId);
            if (!tasks.isEmpty()) {
                planTaskRepository.deleteAll(tasks);
            }
        } catch (Exception e) {
            log.warn("Error deleting plan tasks for topic {}: {}", topicId, e.getMessage());
        }

        topicRepository.delete(topic);
    }

    @Transactional
    public void verifyCanModifySyllabusOrTopics(Long courseId, com.studygenie.backend.security.AuthenticatedUser userDetails) {
        if (userDetails == null || userDetails.id() == null) {
            throw new com.studygenie.backend.exception.UnauthorizedException("Unauthorized");
        }
        com.studygenie.backend.entity.enums.Role role = userDetails.role();
        if (role == com.studygenie.backend.entity.enums.Role.ADMIN
                || role == com.studygenie.backend.entity.enums.Role.MODERATOR) {
            return;
        }
        long totalEnrolled = studentRepository.countEnrolledStudentsByCourseId(courseId);
        if (totalEnrolled > 1) {
            throw new com.studygenie.backend.exception.ForbiddenException(
                    "Only an admin or moderator can delete topics or reset the syllabus of a shared course with multiple students.");
        }
        long callerEnrolled = studentRepository.countEnrollmentByCourseIdAndStudentId(courseId, userDetails.id());
        if (callerEnrolled == 1) {
            return;
        }
        Syllabus syllabus = syllabusRepository.findByCourseId(courseId).orElse(null);
        if (totalEnrolled == 0 && syllabus != null && syllabus.getUploadedBy() != null
                && userDetails.id().equals(syllabus.getUploadedBy().getId())) {
            return;
        }
        throw new com.studygenie.backend.exception.ForbiddenException(
                "You must be the sole enrolled student or an admin/moderator to modify this course's syllabus or topics.");
    }

    @Transactional
    public void deleteTopic(Long courseId, Long topicId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic not found"));

        if (!topic.getSyllabus().getCourse().getId().equals(course.getId())) {
            throw new IllegalArgumentException("Topic does not belong to this course");
        }

        Long syllabusId = topic.getSyllabus().getId();
        deleteTopicCascade(topic);

        List<Topic> remaining = topicRepository.findBySyllabusId(syllabusId);
        if (remaining.isEmpty()) {
            course.setStatus(CourseStatus.NO_SYLLABUS);
            courseRepository.save(course);
        }
    }

    @Transactional
    public void deleteSyllabus(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        Syllabus syllabus = course.getSyllabus();
        if (syllabus == null) {
            syllabus = syllabusRepository.findByCourseId(courseId).orElse(null);
        }

        if (syllabus != null) {
            List<Topic> topics = topicRepository.findBySyllabusId(syllabus.getId());
            for (Topic t : topics) {
                deleteTopicCascade(t);
            }
            course.setSyllabus(null);
            syllabusRepository.delete(syllabus);
        }

        course.setStatus(CourseStatus.NO_SYLLABUS);
        courseRepository.save(course);
        log.info("Reset syllabus for course '{}' (ID: {}) successfully", course.getName(), courseId);
    }

    @Transactional
    public void deleteCourse(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        long enrolledCount = studentRepository.countEnrolledStudentsByCourseId(courseId);
        if (enrolledCount > 0) {
            throw new BadRequestException(
                    "Cannot delete a shared course while students are still enrolled. Unenroll from it instead.");
        }

        // Delete associated study plans and their tasks
        List<StudyPlan> plans = studyPlanRepository.findByCourseId(courseId);
        for (StudyPlan plan : plans) {
            List<PlanTask> tasks = planTaskRepository.findByStudyPlanId(plan.getId());
            if (!tasks.isEmpty()) {
                planTaskRepository.deleteAll(tasks);
            }
            studyPlanRepository.delete(plan);
        }

        // Delete associated syllabus and its topics
        Syllabus syllabus = course.getSyllabus();
        if (syllabus == null) {
            syllabus = syllabusRepository.findByCourseId(courseId).orElse(null);
        }
        if (syllabus != null) {
            List<Topic> topics = topicRepository.findBySyllabusId(syllabus.getId());
            for (Topic t : topics) {
                deleteTopicCascade(t);
            }
            course.setSyllabus(null);
            syllabusRepository.delete(syllabus);
        }

        // Remove enrollment from all students
        List<Student> enrolledStudents = studentRepository.findAll();
        for (Student s : enrolledStudents) {
            if (s.getEnrolledCourses() != null && s.getEnrolledCourses().removeIf(c -> c.getId().equals(courseId))) {
                studentRepository.save(s);
            }
        }

        // Delete course
        courseRepository.delete(course);
        log.info("Deleted course '{}' (ID: {}) successfully", course.getName(), courseId);
    }

    @Transactional
    public CourseDto createCourse(Long collegeId, String name) {
        College college = null;
        if (collegeId != null) {
            college = collegeRepository.findById(collegeId).orElse(null);
        }
        if (college == null) {
            college = collegeRepository.findById(1L).orElseGet(() -> {
                List<College> all = collegeRepository.findAll();
                return all.isEmpty() ? null : all.get(0);
            });
        }
        if (college == null) {
            University uni = universityRepository.findAll().stream().findFirst().orElseGet(() ->
                    universityRepository.save(University.builder().name("General University").build())
            );
            college = collegeRepository.save(College.builder().name("College of Computing").university(uni).build());
        }

        List<Course> existingCourses = courseRepository.findByCollegeId(college.getId());
        for (Course ec : existingCourses) {
            if (ec.getName().equalsIgnoreCase(name.trim())) {
                return new CourseDto(ec.getId(), ec.getName(), ec.getCollege().getId(), ec.getStatus());
            }
        }

        Course course = Course.builder()
                .name(name.trim())
                .college(college)
                .status(CourseStatus.NO_SYLLABUS)
                .build();

        try {
            course = courseRepository.save(course);
            courseRepository.flush();
        } catch (DataIntegrityViolationException e) {
            for (Course ec : courseRepository.findByCollegeId(college.getId())) {
                if (ec.getName().equalsIgnoreCase(name.trim())) {
                    return new CourseDto(ec.getId(), ec.getName(), ec.getCollege().getId(), ec.getStatus());
                }
            }
            throw new DuplicateResourceException("Course with this name already exists in this college");
        }

        return new CourseDto(course.getId(), course.getName(), course.getCollege().getId(), course.getStatus());
    }

    @Transactional
    public PlanResponseData joinChallenge(Long courseId, Long userId, LocalDate examDate, Double dailyHours, String mode) {
        return joinChallenge(courseId, userId, examDate, dailyHours, mode, null);
    }

    @Transactional
    public PlanResponseData joinChallenge(Long courseId, Long userId, LocalDate examDate, Double dailyHours, String mode, List<Long> selectedTopicIds) {
        return joinChallenge(courseId, userId, examDate, dailyHours, mode, selectedTopicIds, null);
    }

    @Transactional
    public PlanResponseData joinChallenge(Long courseId, Long userId, LocalDate examDate, Double dailyHours, String mode, List<Long> selectedTopicIds, List<Integer> requestedRestWeekdays) {
        if (examDate == null || !examDate.isAfter(LocalDate.now())) {
            throw new BadRequestException("Exam date must be in the future.");
        }

        List<Integer> restWeekdays = resolveAndValidateRestWeekdays(requestedRestWeekdays, null);

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (course.getStatus() == CourseStatus.NO_SYLLABUS || course.getSyllabus() == null) {
            throw new ResourceNotFoundException("This course has no syllabus yet.", "NO_SYLLABUS");
        }
        if (course.getStatus() != CourseStatus.READY) {
            throw new ResourceNotReadyException("Course syllabus is not ready yet.", "SYLLABUS_NOT_READY");
        }

        if (studyPlanRepository.findByStudentIdAndCourseId(userId, courseId).isPresent()) {
            throw new DuplicateResourceException("You have already joined this course and generated a plan.", "ALREADY_JOINED");
        }

        Student student = studentRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        List<TopicPlanInput> topics = topicRepository.findBySyllabusId(course.getSyllabus().getId()).stream()
                .filter(t -> selectedTopicIds == null || selectedTopicIds.isEmpty() || selectedTopicIds.contains(t.getId()))
                .map(t -> TopicPlanInput.builder()
                        .ref(String.valueOf(t.getId()))
                        .chapterTitle(t.getChapterTitle())
                        .orderIndex(t.getOrderIndex())
                        .estimatedHours(t.getEstimatedHours() != null && t.getEstimatedHours() > 0 ? t.getEstimatedHours() : 0.5)
                        .importance(t.getImportance() != null && t.getImportance() > 0 ? t.getImportance() : 3)
                        .subtopics(extractSubtopicLabels(t.getContentExcerpt()))
                        .build())
                .collect(Collectors.toList());

        if (topics.isEmpty()) {
            throw new ResourceNotFoundException("This course has no syllabus chapters or topics yet. Please upload the syllabus first.", "NO_TOPICS");
        }

        double effDailyHours = dailyHours != null ? dailyHours : 2.0;
        String effMode = mode != null && !mode.isBlank() ? mode.toUpperCase() : "NORMAL";
        int bufferDays = 3;

        // 1. Generate Plan first (validates & computes full schedule)
        GeneratePlanRequest request = GeneratePlanRequest.builder()
                .startDate(LocalDate.now())
                .examDate(examDate)
                .topics(topics)
                .dailyHours(effDailyHours)
                .restWeekdays(restWeekdays)
                .mode(effMode)
                .bufferDaysBeforeExam(bufferDays)
                .reviewRatio(0.2)
                .courseId(courseId)
                .build();

        PlanResponseData data = studyPlanService.generatePlan(request, course.getId(), course.getName());

        // 2. Save StudyPlan with full configuration & summary metadata
        StudyPlan studyPlan = StudyPlan.builder()
                .student(student)
                .course(course)
                .examDate(examDate)
                .mode(data.summary() != null && data.summary().mode() != null ? data.summary().mode() : effMode)
                .dailyHours(effDailyHours)
                .restWeekdays(formatRestWeekdays(restWeekdays))
                .bufferDays(bufferDays)
                .studyDays(data.summary() != null ? data.summary().studyDays() : null)
                .capacityMinutes(data.summary() != null ? data.summary().capacityMinutes() : null)
                .feasible(data.summary() != null ? data.summary().feasible() : Boolean.TRUE)
                .warningsJson(writeJson(data.summary() != null ? data.summary().warnings() : List.of()))
                .skippedTopicsJson(writeJson(data.skippedTopics() != null ? data.skippedTopics() : List.of()))
                .build();
        studyPlan = studyPlanRepository.save(studyPlan);
        if (student.getEnrolledCourses() != null && !student.getEnrolledCourses().contains(course)) {
            student.getEnrolledCourses().add(course);
            studentRepository.save(student);
        }
        syncExamDate(student, course.getName(), examDate);

        // 3. Persist PlanTasks with full task metadata
        savePlanTasks(studyPlan, data);

        return data;
    }

    @Transactional
    public PlanResponseData regeneratePlan(Long courseId, Long userId, LocalDate examDate, Double dailyHours, String mode) {
        return regeneratePlan(courseId, userId, examDate, dailyHours, mode, null, null);
    }

    @Transactional
    public PlanResponseData regeneratePlan(Long courseId, Long userId, LocalDate examDate, Double dailyHours, String mode, List<Long> selectedTopicIds) {
        return regeneratePlan(courseId, userId, examDate, dailyHours, mode, selectedTopicIds, null);
    }

    @Transactional
    public PlanResponseData regeneratePlan(Long courseId, Long userId, LocalDate examDate, Double dailyHours, String mode, List<Long> selectedTopicIds, List<Integer> requestedRestWeekdays) {
        if (examDate == null || !examDate.isAfter(LocalDate.now())) {
            throw new BadRequestException("Exam date must be in the future.");
        }

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (course.getStatus() == CourseStatus.NO_SYLLABUS || course.getSyllabus() == null) {
            throw new ResourceNotFoundException("This course has no syllabus yet.", "NO_SYLLABUS");
        }
        if (course.getStatus() != CourseStatus.READY) {
            throw new ResourceNotReadyException("Course syllabus is not ready yet.", "SYLLABUS_NOT_READY");
        }

        Student student = studentRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        // Fetch existing StudyPlan or create new one
        StudyPlan studyPlan = studyPlanRepository.findByStudentIdAndCourseId(userId, courseId)
                .orElseGet(() -> StudyPlan.builder()
                        .student(student)
                        .course(course)
                        .examDate(examDate)
                        .build());

        List<Integer> restWeekdays = resolveAndValidateRestWeekdays(requestedRestWeekdays, studyPlan.getRestWeekdays());
        double effDailyHours = dailyHours != null ? dailyHours : (studyPlan.getDailyHours() != null ? studyPlan.getDailyHours() : 2.0);
        String effMode = mode != null && !mode.isBlank() ? mode.toUpperCase() : (studyPlan.getMode() != null ? studyPlan.getMode() : "NORMAL");
        int bufferDays = 3;

        // Fetch all current syllabus topics (including newly added chapters!)
        List<TopicPlanInput> topics = topicRepository.findBySyllabusId(course.getSyllabus().getId()).stream()
                .filter(t -> selectedTopicIds == null || selectedTopicIds.isEmpty() || selectedTopicIds.contains(t.getId()))
                .map(t -> TopicPlanInput.builder()
                        .ref(String.valueOf(t.getId()))
                        .chapterTitle(t.getChapterTitle())
                        .orderIndex(t.getOrderIndex())
                        .estimatedHours(t.getEstimatedHours() != null && t.getEstimatedHours() > 0 ? t.getEstimatedHours() : 0.5)
                        .importance(t.getImportance() != null && t.getImportance() > 0 ? t.getImportance() : 3)
                        .subtopics(extractSubtopicLabels(t.getContentExcerpt()))
                        .build())
                .collect(Collectors.toList());

        if (topics.isEmpty()) {
            throw new ResourceNotFoundException("This course has no syllabus chapters or topics yet. Please upload the syllabus first.", "NO_TOPICS");
        }

        GeneratePlanRequest request = GeneratePlanRequest.builder()
                .startDate(LocalDate.now())
                .examDate(examDate)
                .topics(topics)
                .dailyHours(effDailyHours)
                .restWeekdays(restWeekdays)
                .mode(effMode)
                .bufferDaysBeforeExam(bufferDays)
                .reviewRatio(0.2)
                .courseId(courseId)
                .build();

        PlanResponseData data = studyPlanService.generatePlan(request, course.getId(), course.getName());

        studyPlan.setExamDate(examDate);
        studyPlan.setMode(data.summary() != null && data.summary().mode() != null ? data.summary().mode() : effMode);
        studyPlan.setDailyHours(effDailyHours);
        studyPlan.setRestWeekdays(formatRestWeekdays(restWeekdays));
        studyPlan.setBufferDays(bufferDays);
        if (data.summary() != null) {
            studyPlan.setStudyDays(data.summary().studyDays());
            studyPlan.setCapacityMinutes(data.summary().capacityMinutes());
            studyPlan.setFeasible(data.summary().feasible());
            studyPlan.setWarningsJson(writeJson(data.summary().warnings()));
        }
        studyPlan.setSkippedTopicsJson(writeJson(data.skippedTopics() != null ? data.skippedTopics() : List.of()));
        studyPlan = studyPlanRepository.save(studyPlan);

        if (student.getEnrolledCourses() != null && !student.getEnrolledCourses().contains(course)) {
            student.getEnrolledCourses().add(course);
            studentRepository.save(student);
        }
        syncExamDate(student, course.getName(), examDate);

        // Delete previous plan tasks for this plan so we regenerate fresh with all latest chapters
        List<PlanTask> oldTasks = planTaskRepository.findByStudyPlanId(studyPlan.getId());
        if (!oldTasks.isEmpty()) {
            planTaskRepository.deleteAll(oldTasks);
        }

        List<PlanTask> savedTasks = savePlanTasks(studyPlan, data);

        log.info("Successfully regenerated study plan for course '{}' (ID: {}) with {} tasks",
                course.getName(), course.getId(), savedTasks.size());

        return data;
    }

    @Transactional(readOnly = true)
    public PlanResponseData getPlan(Long courseId, Long userId) {
        StudyPlan studyPlan = studyPlanRepository.findByStudentIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new ResourceNotFoundException("You have not joined this course.", "NOT_JOINED"));

        List<PlanTask> planTasks = planTaskRepository.findByStudyPlanId(studyPlan.getId());
        planTasks.sort((a, b) -> {
            int dateCmp = a.getScheduledDate().compareTo(b.getScheduledDate());
            if (dateCmp != 0) return dateCmp;
            String tA = a.getTaskType() != null ? a.getTaskType() : "STUDY";
            String tB = b.getTaskType() != null ? b.getTaskType() : "STUDY";
            int typeCmp = ("STUDY".equalsIgnoreCase(tA) ? 0 : 1) - ("STUDY".equalsIgnoreCase(tB) ? 0 : 1);
            if (typeCmp != 0) return typeCmp;
            long idA = a.getId() != null ? a.getId() : 0L;
            long idB = b.getId() != null ? b.getId() : 0L;
            return Long.compare(idA, idB);
        });

        List<Task> tasks = planTasks.stream()
                .map(pt -> {
                    Topic topic = pt.getTopic();
                    String title = (topic != null && topic.getChapterTitle() != null)
                            ? topic.getChapterTitle()
                            : "Topic " + (topic != null ? topic.getId() : "1");
                    String taskType = (pt.getTaskType() != null && !pt.getTaskType().isBlank())
                            ? pt.getTaskType()
                            : "STUDY";
                    int minutes = (pt.getMinutes() != null && pt.getMinutes() > 0)
                            ? pt.getMinutes()
                            : (int) Math.round(((topic != null && topic.getEstimatedHours() != null && topic.getEstimatedHours() > 0)
                                    ? topic.getEstimatedHours()
                                    : 2.0) * 60);
                    String description = (pt.getDescription() != null && !pt.getDescription().isBlank())
                            ? pt.getDescription()
                            : ("REVIEW".equalsIgnoreCase(taskType)
                                    ? "Active Recall & Practice Quiz: " + title
                                    : "Study " + title);
                    List<String> subtopics = readStringList(pt.getSubtopicsJson());
                    return new Task(
                            pt.getScheduledDate(),
                            String.valueOf(topic != null ? topic.getId() : 1),
                            title,
                            taskType,
                            minutes,
                            description,
                            subtopics
                    );
                })
                .collect(Collectors.toList());

        List<SkippedTopic> skippedTopics = readSkippedTopics(studyPlan.getSkippedTopicsJson());
        List<String> warnings = readStringList(studyPlan.getWarningsJson());
        String mode = (studyPlan.getMode() != null && !studyPlan.getMode().isBlank()) ? studyPlan.getMode() : "NORMAL";
        int studyDays = (studyPlan.getStudyDays() != null && studyPlan.getStudyDays() > 0)
                ? studyPlan.getStudyDays()
                : (int) tasks.stream().map(Task::date).distinct().count();
        int plannedMinutes = tasks.stream().mapToInt(Task::minutes).sum();
        int capacityMinutes = (studyPlan.getCapacityMinutes() != null && studyPlan.getCapacityMinutes() > 0)
                ? studyPlan.getCapacityMinutes()
                : (int) Math.round(studyDays * (studyPlan.getDailyHours() != null ? studyPlan.getDailyHours() : 2.0) * 60);
        int plannedTopics = (int) tasks.stream()
                .filter(t -> !"REVIEW".equalsIgnoreCase(t.taskType()))
                .map(Task::topicRef)
                .distinct()
                .count();
        if (plannedTopics == 0 && !tasks.isEmpty()) {
            plannedTopics = (int) tasks.stream().map(Task::topicRef).distinct().count();
        }
        boolean feasible = studyPlan.getFeasible() != null ? studyPlan.getFeasible() : skippedTopics.isEmpty();

        PlanSummary summary = new PlanSummary(
                mode,
                studyDays,
                capacityMinutes,
                plannedMinutes,
                plannedTopics,
                skippedTopics.size(),
                feasible,
                warnings
        );
        return new PlanResponseData(tasks, skippedTopics, summary);
    }

    private List<PlanTask> savePlanTasks(StudyPlan studyPlan, PlanResponseData data) {
        List<PlanTask> planTasks = new ArrayList<>();
        if (data.tasks() != null) {
            for (Task task : data.tasks()) {
                try {
                    Long topicId = Long.valueOf(task.topicRef());
                    Topic topic = topicRepository.findById(topicId).orElse(null);
                    if (topic == null) {
                        log.warn("Topic with ID {} not found. Skipping task.", topicId);
                        continue;
                    }
                    PlanTask planTask = PlanTask.builder()
                            .studyPlan(studyPlan)
                            .topic(topic)
                            .scheduledDate(task.date())
                            .isCompleted(false)
                            .xpAwarded(false)
                            .taskType(task.taskType() != null && !task.taskType().isBlank() ? task.taskType() : "STUDY")
                            .minutes(task.minutes() > 0 ? task.minutes() : 30)
                            .description(task.description())
                            .subtopicsJson(writeJson(task.subtopics() != null ? task.subtopics() : List.of()))
                            .build();
                    planTasks.add(planTask);
                } catch (NumberFormatException e) {
                    log.warn("Invalid topic ref: {}. Skipping task.", task.topicRef());
                }
            }
            if (!planTasks.isEmpty()) {
                planTasks = planTaskRepository.saveAll(planTasks);
            }
        }
        return planTasks;
    }

    private List<Integer> resolveAndValidateRestWeekdays(List<Integer> requested, String persistedCsv) {
        List<Integer> resolved;
        if (requested != null) {
            resolved = requested;
        } else if (persistedCsv != null) {
            resolved = parseRestWeekdays(persistedCsv);
        } else {
            resolved = List.of(4); // Default Friday (Python weekday 4)
        }
        List<Integer> normalized = new ArrayList<>();
        for (Integer day : resolved) {
            if (day == null || day < 0 || day > 6) {
                throw new BadRequestException("Rest weekdays must be between 0 (Monday) and 6 (Sunday).");
            }
            if (!normalized.contains(day)) {
                normalized.add(day);
            }
        }
        return normalized;
    }

    private String formatRestWeekdays(List<Integer> days) {
        if (days == null || days.isEmpty()) {
            return "";
        }
        return days.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private List<Integer> parseRestWeekdays(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        List<Integer> list = new ArrayList<>();
        for (String part : csv.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                try {
                    int val = Integer.parseInt(trimmed);
                    if (val >= 0 && val <= 6 && !list.contains(val)) {
                        list.add(val);
                    }
                } catch (NumberFormatException ignored) {}
            }
        }
        return list;
    }

    private List<String> extractSubtopicLabels(String contentExcerpt) {
        if (contentExcerpt == null || contentExcerpt.isBlank()) {
            return List.of();
        }
        List<String> labels = new ArrayList<>();
        for (String block : contentExcerpt.split("\\R\\R+")) {
            String line = block.trim();
            if (!line.isEmpty()) {
                int colonIdx = line.indexOf(':');
                String label = colonIdx > 0 ? line.substring(0, colonIdx).trim() : line;
                if (!label.isEmpty()) {
                    labels.add(label.length() > 100 ? label.substring(0, 100) : label);
                }
            }
            if (labels.size() >= 6) break;
        }
        return labels;
    }

    private String writeJson(Object value) {
        if (value == null) return "[]";
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<String> readStringList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<SkippedTopic> readSkippedTopics(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<SkippedTopic>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
    private void syncExamDate(Student student, String courseName, LocalDate examDate) {
        if (student == null || courseName == null || examDate == null) return;
        try {
            var existingExam = examRepository.findFirstByStudentIdAndCourseIgnoreCase(student.getId(), courseName.trim());
            Exam exam = existingExam.orElseGet(() -> Exam.builder()
                    .student(student)
                    .uploaderName(student.getFullName() != null && !student.getFullName().isBlank() ? student.getFullName() : student.getEmail())
                    .course(courseName.trim())
                    .type("Final Exam")
                    .build());
            exam.setDate(examDate);
            examRepository.save(exam);
            log.info("Synchronized Exam date for student '{}' course '{}' to {}", student.getId(), courseName, examDate);
        } catch (Exception e) {
            log.warn("Non-fatal: could not sync Exam record for course {}: {}", courseName, e.getMessage());
        }
    }
}