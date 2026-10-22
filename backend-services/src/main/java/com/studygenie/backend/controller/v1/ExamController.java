package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.exam.CreateExamRequest;
import com.studygenie.backend.dto.exam.ExamDto;
import com.studygenie.backend.entity.College;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.Exam;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.repository.CollegeRepository;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.repository.ExamRepository;
import com.studygenie.backend.repository.StudentRepository;
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

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/exams")
@Tag(name = "Exams", description = "Endpoints for managing student scheduled exams and countdowns")
@SecurityRequirement(name = "bearerAuth")
public class ExamController {

    private static final Logger log = LoggerFactory.getLogger(ExamController.class);

    private final ExamRepository examRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final CollegeRepository collegeRepository;

    public ExamController(ExamRepository examRepository,
                          StudentRepository studentRepository,
                          CourseRepository courseRepository,
                          CollegeRepository collegeRepository) {
        this.examRepository = examRepository;
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
        this.collegeRepository = collegeRepository;
    }

    @GetMapping
    @Operation(summary = "Get all exams for current student")
    public ResponseEntity<ApiResponse<List<ExamDto>>> getMyExams(
            @AuthenticationPrincipal AuthenticatedUser userDetails) {
        Long studentId = userDetails.id();
        List<ExamDto> list = examRepository.findByStudentIdOrderByDateAsc(studentId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok("Exams fetched successfully", list));
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Create an upcoming exam")
    public ResponseEntity<ApiResponse<ExamDto>> createExam(
            @AuthenticationPrincipal AuthenticatedUser userDetails,
            @Valid @RequestBody CreateExamRequest req) {
        Long studentId = userDetails.id();
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        Exam exam = Exam.builder()
                .student(student)
                .course(req.course().trim())
                .type(req.type().trim())
                .date(req.date())
                .professor(req.professor() != null ? req.professor().trim() : "")
                .build();
        exam = examRepository.save(exam);

        // Also ensure a corresponding course exists and is enrolled by the student
        try {
            ensureCourseEnrolled(student, req.course().trim());
        } catch (Exception ex) {
            log.warn("Non-fatal: could not auto-enroll course for exam {}: {}", req.course(), ex.getMessage());
        }

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
        return new ExamDto(
                e.getId(),
                e.getCourse(),
                e.getType(),
                e.getDate(),
                e.getProfessor()
        );
    }
}
