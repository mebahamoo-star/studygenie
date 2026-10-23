package com.studygenie.backend.service.browse;

import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.PlanResponseData;
import com.studygenie.backend.dto.ai.PlanSummary;
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

    @Transactional(readOnly = true)
    public List<CourseDto> getAllCourses() {
        return courseRepository.findAll().stream()
                .map(c -> new CourseDto(c.getId(), c.getName(), c.getCollege() != null ? c.getCollege().getId() : null, c.getStatus()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CourseDto> getCoursesByCollege(Long collegeId) {
        if (collegeId == null || !collegeRepository.existsById(collegeId)) {
            return getAllCourses();
        }
        return courseRepository.findByCollegeId(collegeId).stream()
                .map(c -> new CourseDto(c.getId(), c.getName(), c.getCollege() != null ? c.getCollege().getId() : null, c.getStatus()))
                .collect(Collectors.toList());
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
                .map(t -> new TopicPlanInput(
                        String.valueOf(t.getId()),
                        t.getChapterTitle(),
                        t.getOrderIndex(),
                        t.getEstimatedHours(),
                        1 // default importance
                ))
                .collect(Collectors.toList());

        // 1. Save StudyPlan first
        StudyPlan studyPlan = StudyPlan.builder()
                .student(student)
                .course(course)
                .examDate(examDate)
                .build();
        studyPlan = studyPlanRepository.save(studyPlan);
        if (student.getEnrolledCourses() != null && !student.getEnrolledCourses().contains(course)) {
            student.getEnrolledCourses().add(course);
            studentRepository.save(student);
        }
        syncExamDate(student, course.getName(), examDate);

        // 2. Generate Plan
        GeneratePlanRequest request = new GeneratePlanRequest(
                LocalDate.now(),
                examDate,
                topics,
                dailyHours != null ? dailyHours : 2.0,
                List.of(7), // default rest day Sunday
                mode != null ? mode : "NORMAL",
                3, // buffer
                0.2 // review ratio
        );

        PlanResponseData data = studyPlanService.generatePlan(request);

        // 3. Persist PlanTasks
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
                            .build();
                    planTasks.add(planTask);
                } catch (NumberFormatException e) {
                    log.warn("Invalid topic ref: {}. Skipping task.", task.topicRef());
                }
            }
            planTaskRepository.saveAll(planTasks);
        }

        return data;
    }

    @Transactional
    public PlanResponseData regeneratePlan(Long courseId, Long userId, LocalDate examDate, Double dailyHours, String mode) {
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

        studyPlan.setExamDate(examDate);
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

        // Fetch all current syllabus topics (including newly added chapters!)
        List<TopicPlanInput> topics = topicRepository.findBySyllabusId(course.getSyllabus().getId()).stream()
                .map(t -> new TopicPlanInput(
                        String.valueOf(t.getId()),
                        t.getChapterTitle(),
                        t.getOrderIndex(),
                        t.getEstimatedHours(),
                        1
                ))
                .collect(Collectors.toList());

        GeneratePlanRequest request = new GeneratePlanRequest(
                LocalDate.now(),
                examDate,
                topics,
                dailyHours != null ? dailyHours : 2.0,
                List.of(7),
                mode != null ? mode : "NORMAL",
                3,
                0.2
        );

        PlanResponseData data = studyPlanService.generatePlan(request);

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
                            .build();
                    planTasks.add(planTask);
                } catch (NumberFormatException e) {
                    log.warn("Invalid topic ref: {}. Skipping task.", task.topicRef());
                }
            }
            if (!planTasks.isEmpty()) {
                planTaskRepository.saveAll(planTasks);
            }
        }

        log.info("Successfully regenerated study plan for course '{}' (ID: {}) with {} tasks",
                course.getName(), course.getId(), planTasks.size());

        return data;
    }

    @Transactional(readOnly = true)
    public PlanResponseData getPlan(Long courseId, Long userId) {
        StudyPlan studyPlan = studyPlanRepository.findByStudentIdAndCourseId(userId, courseId)
                .orElseThrow(() -> new ResourceNotFoundException("You have not joined this course.", "NOT_JOINED"));

        List<PlanTask> planTasks = planTaskRepository.findByStudyPlanId(studyPlan.getId());
        List<Task> tasks = planTasks.stream()
                .map(pt -> {
                    String title = (pt.getTopic() != null && pt.getTopic().getChapterTitle() != null)
                            ? pt.getTopic().getChapterTitle()
                            : "Topic " + (pt.getTopic() != null ? pt.getTopic().getId() : "1");
                    return new Task(
                            pt.getScheduledDate(),
                            String.valueOf(pt.getTopic() != null ? pt.getTopic().getId() : 1),
                            title,
                            "STUDY",
                            (int) ((pt.getTopic() != null ? pt.getTopic().getEstimatedHours() : 2.0) * 60),
                            "Study " + title,
                            List.of()
                    );
                })
                .collect(Collectors.toList());

        PlanSummary summary = new PlanSummary("NORMAL", 1, 0, 0, tasks.size(), 0, true, List.of());
        return new PlanResponseData(tasks, List.of(), summary);
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