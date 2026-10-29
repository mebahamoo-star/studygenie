package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.exam.CommunityExamChallengeDto;
import com.studygenie.backend.dto.exam.CreateExamRequest;
import com.studygenie.backend.dto.exam.ExamDto;
import com.studygenie.backend.entity.College;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.Exam;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.StudyPlan;
import com.studygenie.backend.repository.StudyPlanRepository;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.repository.CollegeRepository;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.repository.ExamRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.repository.SyllabusRepository;
import com.studygenie.backend.repository.TopicRepository;
import com.studygenie.backend.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/exams")
@Tag(name = "Exams", description = "Endpoints for managing student scheduled exams and countdowns")
@SecurityRequirement(name = "bearerAuth")
public class ExamController {

    private final java.util.Map<String, CachedChallenges> challengesCache = new java.util.concurrent.ConcurrentHashMap<>();
    private record CachedChallenges(long timestamp, List<CommunityExamChallengeDto> list) {}


    private static final Logger log = LoggerFactory.getLogger(ExamController.class);

    private final ExamRepository examRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final CollegeRepository collegeRepository;
    private final SyllabusRepository syllabusRepository;
    private final TopicRepository topicRepository;
    private final StudyPlanRepository studyPlanRepository;

    public ExamController(ExamRepository examRepository,
                          StudentRepository studentRepository,
                          CourseRepository courseRepository,
                          CollegeRepository collegeRepository,
                          SyllabusRepository syllabusRepository,
                          TopicRepository topicRepository,
                          StudyPlanRepository studyPlanRepository) {
        this.examRepository = examRepository;
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
        this.collegeRepository = collegeRepository;
        this.syllabusRepository = syllabusRepository;
        this.topicRepository = topicRepository;
        this.studyPlanRepository = studyPlanRepository;
    }

    @GetMapping
    @Operation(summary = "Get all exams for current student")
    public ResponseEntity<ApiResponse<List<ExamDto>>> getMyExams(
            @AuthenticationPrincipal AuthenticatedUser userDetails) {
        if (userDetails == null || userDetails.id() == null) {
            return ResponseEntity.ok(ApiResponse.ok("Exams fetched successfully", List.of()));
        }

        Long studentId = userDetails.id();
        Student student = studentRepository.findById(studentId).orElse(null);
        if (student == null) {
            return ResponseEntity.ok(ApiResponse.ok("Exams fetched successfully", List.of()));
        }

        // Return all exams belonging to this student (both enrolled course exams and target exams)
        List<Exam> exams = examRepository.findByStudentIdOrderByDateAsc(studentId);

        List<ExamDto> list = exams.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok("Exams fetched successfully", list));
    }

    @GetMapping("/challenges")
    @Operation(summary = "Get community exam challenges from peers in same university/college")
    public ResponseEntity<ApiResponse<List<CommunityExamChallengeDto>>> getCommunityChallenges(
            @AuthenticationPrincipal AuthenticatedUser userDetails,
            @RequestParam(value = "college_id", required = false) Long collegeId) {
        String cacheKey = (collegeId != null ? collegeId : "all") + "_" + (userDetails != null ? userDetails.id() : "anon");
        CachedChallenges cached = challengesCache.get(cacheKey);
        if (cached != null && (System.currentTimeMillis() - cached.timestamp() < 30_000)) {
            return ResponseEntity.ok(ApiResponse.ok("Community exam challenges fetched", cached.list()));
        }

        Long currentStudentId = userDetails != null ? userDetails.id() : null;
        Student student = currentStudentId != null ? studentRepository.findById(currentStudentId).orElse(null) : null;

        Set<String> enrolledCourseNames = new HashSet<>();
        if (student != null && student.getEnrolledCourses() != null) {
            for (Course c : student.getEnrolledCourses()) {
                if (c.getName() != null) {
                    enrolledCourseNames.add(c.getName().trim().toLowerCase());
                }
            }
        }

        Set<String> myExamCourses = currentStudentId != null
                ? examRepository.findByStudentIdOrderByDateAsc(currentStudentId).stream()
                    .map(e -> e.getCourse().trim().toLowerCase())
                    .collect(Collectors.toSet())
                : Collections.emptySet();

        List<Exam> allExams = examRepository.findAll();
        Map<String, CommunityExamChallengeDto> challengeMap = new LinkedHashMap<>();

        // Preload courses in memory to eliminate N+1 queries
        List<Course> allCourses = courseRepository.findAll();
        Map<String, Course> courseMapByName = new HashMap<>();
        for (Course c : allCourses) {
            if (c.getName() != null) {
                courseMapByName.putIfAbsent(c.getName().trim().toLowerCase(), c);
            }
        }

        for (Exam e : allExams) {
            String courseName = e.getCourse() != null ? e.getCourse().trim() : "";
            if (courseName.isBlank()) continue;
            String key = courseName.toLowerCase();

            Course matchedCourse = courseMapByName.get(key);
            Long matchedCourseId = matchedCourse != null ? matchedCourse.getId() : null;

            boolean hasSyllabus = matchedCourse != null && matchedCourse.getStatus() == CourseStatus.READY;
            int chaptersCount = hasSyllabus ? 5 : 0;

            boolean isJoined = enrolledCourseNames.contains(key) || myExamCourses.contains(key);

            String uploader = (e.getUploaderName() != null && !e.getUploaderName().isBlank())
                    ? e.getUploaderName()
                    : (e.getStudent() != null && e.getStudent().getFullName() != null)
                    ? e.getStudent().getFullName()
                    : "Peer Student";

            String uniName = (e.getStudent() != null && e.getStudent().getUniversity() != null)
                    ? e.getStudent().getUniversity().getName()
                    : (student != null && student.getUniversity() != null ? student.getUniversity().getName() : "University");

            String colName = (matchedCourse != null && matchedCourse.getCollege() != null)
                    ? matchedCourse.getCollege().getName()
                    : "College";

            CommunityExamChallengeDto dto = new CommunityExamChallengeDto(
                    e.getId(),
                    matchedCourseId,
                    courseName,
                    e.getType(),
                    e.getDate(),
                    e.getProfessor(),
                    uploader,
                    uniName,
                    colName,
                    hasSyllabus,
                    chaptersCount,
                    Math.max(1, (int)(e.getId() % 8) + 2),
                    isJoined
            );

            if (!challengeMap.containsKey(key) || (!challengeMap.get(key).isJoined() && isJoined)) {
                challengeMap.put(key, dto);
            }
        }

        List<CommunityExamChallengeDto> result = new ArrayList<>(challengeMap.values());
        result.sort((a, b) -> {
            if (a.isJoined() != b.isJoined()) {
                return a.isJoined() ? 1 : -1;
            }
            if (a.examDate() == null) return 1;
            if (b.examDate() == null) return -1;
            return a.examDate().compareTo(b.examDate());
        });

        challengesCache.put(cacheKey, new CachedChallenges(System.currentTimeMillis(), result));
        return ResponseEntity.ok(ApiResponse.ok("Community exam challenges fetched", result));
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Create an upcoming exam with student attribution")
    public ResponseEntity<ApiResponse<ExamDto>> createExam(
            @AuthenticationPrincipal AuthenticatedUser userDetails,
            @Valid @RequestBody CreateExamRequest req) {
        Student student = null;
        if (userDetails != null && userDetails.id() != null) {
            student = studentRepository.findById(userDetails.id()).orElse(null);
        }
        if (student == null && req.studentEmail() != null && !req.studentEmail().isBlank()) {
            student = studentRepository.findByEmail(req.studentEmail().trim()).orElse(null);
        }
        if (student == null) {
            student = studentRepository.findAll().stream().findFirst().orElse(null);
        }
        if (student == null) {
            throw new ResourceNotFoundException("No student found in system to associate exam with.");
        }

        String uploader = req.uploaderName();
        if (uploader == null || uploader.isBlank()) {
            uploader = (student.getFullName() != null && !student.getFullName().isBlank())
                    ? student.getFullName()
                    : student.getEmail();
        }

        final Student targetStudent = student;
        Optional<Exam> existingExam = examRepository.findFirstByStudentIdAndCourseIgnoreCase(student.getId(), req.course().trim());
        Exam exam = existingExam.orElseGet(() -> Exam.builder()
                .student(targetStudent)
                .course(req.course().trim())
                .build());

        exam.setUploaderName(uploader.trim());
        exam.setType(req.type().trim());
        exam.setDate(req.date());
        if (req.professor() != null && !req.professor().isBlank()) {
            exam.setProfessor(req.professor().trim());
        }
        exam = examRepository.save(exam);
        challengesCache.clear();

        // Also ensure a corresponding course exists and is enrolled by the student
        try {
            ensureCourseEnrolled(student, req.course().trim());
        } catch (Exception ex) {
            log.warn("Non-fatal: could not auto-enroll course for exam {}: {}", req.course(), ex.getMessage());
        }

        log.info("Exam '{}' for course '{}' saved by student '{}' (id: {})",
                exam.getType(), exam.getCourse(), exam.getUploaderName(), student.getId());

        return ResponseEntity.ok(ApiResponse.ok("Exam created successfully", toDto(exam)));
    }

    @DeleteMapping("/{id}")
    @Transactional
    @Operation(summary = "Delete an exam")
    public ResponseEntity<ApiResponse<Void>> deleteExam(
            @AuthenticationPrincipal AuthenticatedUser userDetails,
            @PathVariable Long id) {
        Long studentId = userDetails.id();
        Exam exam = examRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        if (!exam.getStudent().getId().equals(studentId)) {
            throw new ResourceNotFoundException("Exam not found");
        }

        examRepository.delete(exam);
        challengesCache.clear();
        return ResponseEntity.ok(ApiResponse.ok("Exam deleted successfully", null));
    }

    private void ensureCourseEnrolled(Student student, String courseName) {
        String cleanName = courseName.contains("—") ? courseName.split("—")[1].trim() : courseName.trim();

        boolean alreadyEnrolled = student.getEnrolledCourses().stream()
                .anyMatch(c -> c.getName().equalsIgnoreCase(cleanName));
        if (alreadyEnrolled) return;

        College defaultCollege = collegeRepository.findAll().stream().findFirst().orElse(null);
        if (defaultCollege == null) return;

        Course course = courseRepository.findAll().stream()
                .filter(c -> c.getName().equalsIgnoreCase(cleanName))
                .findFirst()
                .orElseGet(() -> {
                    Course nc = Course.builder()
                            .name(cleanName)
                            .college(defaultCollege)
                            .status(CourseStatus.NO_SYLLABUS)
                            .build();
                    return courseRepository.save(nc);
                });

        student.getEnrolledCourses().add(course);
        studentRepository.save(student);
    }

    private ExamDto toDto(Exam e) {
        String uploader = (e.getUploaderName() != null && !e.getUploaderName().isBlank())
                ? e.getUploaderName()
                : (e.getStudent() != null && e.getStudent().getFullName() != null)
                ? e.getStudent().getFullName()
                : "Peer Student";
        Long sId = e.getStudent() != null ? e.getStudent().getId() : null;

        return new ExamDto(
                e.getId(),
                e.getCourse(),
                e.getType(),
                e.getDate(),
                e.getProfessor(),
                uploader,
                sId
        );
    }
}
