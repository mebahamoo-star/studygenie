package com.studygenie.backend.controller.v1;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.report.CourseReportDto;
import com.studygenie.backend.dto.report.CreateCourseReportRequest;
import com.studygenie.backend.entity.CourseReport;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.repository.CourseReportRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
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
@RequestMapping("/api/v1/courses")
@Tag(name = "Course Reports", description = "Endpoints for reporting incorrect courses or syllabi")
public class CourseReportController {

    private static final Logger log = LoggerFactory.getLogger(CourseReportController.class);

    private final CourseReportRepository courseReportRepository;
    private final StudentRepository studentRepository;

    public CourseReportController(CourseReportRepository courseReportRepository,
                                  StudentRepository studentRepository) {
        this.courseReportRepository = courseReportRepository;
        this.studentRepository = studentRepository;
    }

    @PostMapping("/report")
    @Transactional
    @Operation(summary = "Submit a report for an incorrect course or syllabus")
    public ResponseEntity<ApiResponse<CourseReportDto>> reportCourse(
            @AuthenticationPrincipal AuthenticatedUser userDetails,
            @Valid @RequestBody CreateCourseReportRequest req) {

        String reporter = req.reportedBy();
        if ((reporter == null || reporter.isBlank()) && userDetails != null && userDetails.id() != null) {
            Student s = studentRepository.findById(userDetails.id()).orElse(null);
            if (s != null) {
                reporter = s.getFullName() != null && !s.getFullName().isBlank() ? s.getFullName() : s.getEmail();
            }
        }
        if (reporter == null || reporter.isBlank()) {
            reporter = "Student / Community Member";
        }

        CourseReport report = CourseReport.builder()
                .courseId(req.courseId())
                .courseName(req.courseName().trim())
                .reportedBy(reporter.trim())
                .reason(req.reason().trim())
                .details(req.details() != null ? req.details().trim() : "")
                .status("PENDING")
                .build();

        report = courseReportRepository.save(report);
        log.info("Report filed for course '{}' by '{}': {}", report.getCourseName(), report.getReportedBy(), report.getReason());

        CourseReportDto dto = new CourseReportDto(
                report.getId(),
                report.getCourseId(),
                report.getCourseName(),
                report.getReportedBy(),
                report.getReason(),
                report.getDetails(),
                report.getStatus(),
                report.getCreatedAt()
        );

        return ResponseEntity.ok(ApiResponse.ok("Course report submitted successfully. Our moderators will review it.", dto));
    }

    @GetMapping("/reports")
    @Operation(summary = "Get list of all submitted course reports")
    public ResponseEntity<ApiResponse<List<CourseReportDto>>> getAllReports() {
        List<CourseReportDto> list = courseReportRepository.findByOrderByCreatedAtDesc().stream()
                .map(r -> new CourseReportDto(
                        r.getId(),
                        r.getCourseId(),
                        r.getCourseName(),
                        r.getReportedBy(),
                        r.getReason(),
                        r.getDetails(),
                        r.getStatus(),
                        r.getCreatedAt()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok("Course reports fetched successfully", list));
    }
}
