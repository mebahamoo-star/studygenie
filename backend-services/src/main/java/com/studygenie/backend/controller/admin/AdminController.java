package com.studygenie.backend.controller.admin;

import com.studygenie.backend.dto.ApiResponse;
import com.studygenie.backend.dto.admin.*;
import com.studygenie.backend.dto.syllabus.TopicDto;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.service.admin.AdminAuditService;
import com.studygenie.backend.service.admin.AdminManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin Panel", description = "Administrative endpoints for platform oversight, moderation, courses, users, and audit logs")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AdminManagementService adminService;
    private final AdminAuditService auditService;

    public AdminController(AdminManagementService adminService, AdminAuditService auditService) {
        this.adminService = adminService;
        this.auditService = auditService;
    }

    // =========================================================================
    // 1. OVERVIEW (ADMIN only)
    // =========================================================================

    @GetMapping("/overview")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get platform KPI overview and daily time-series metrics")
    public ResponseEntity<ApiResponse<AdminOverviewDto>> getOverview() {
        return ResponseEntity.ok(ApiResponse.ok("Admin overview fetched successfully", adminService.getOverview()));
    }

    // =========================================================================
    // 2. REPORTS (ADMIN or MODERATOR)
    // =========================================================================

    @GetMapping("/reports")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "List course reports with pagination, filters, and search")
    public ResponseEntity<ApiResponse<AdminPageResponse<AdminReportDto>>> getReports(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "reason", required = false) String reason,
            @RequestParam(value = "courseId", required = false) Long courseId,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Reports fetched successfully",
                adminService.getReports(status, reason, courseId, search, page, size)
        ));
    }

    @GetMapping("/reports/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Get a single course report by ID")
    public ResponseEntity<ApiResponse<AdminReportDto>> getReport(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Report fetched successfully", adminService.getReport(id)));
    }

    @PatchMapping("/reports/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    @Operation(summary = "Update report status and admin note")
    public ResponseEntity<ApiResponse<AdminReportDto>> updateReport(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            @Valid @RequestBody AdminUpdateReportRequest request,
            HttpServletRequest httpRequest) {
        AdminReportDto updated = adminService.updateReport(actor, id, request, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Report updated successfully", updated));
    }

    // =========================================================================
    // 3. COURSES, MERGE, REANALYZE, TOPICS & CATALOG CRUD (ADMIN only)
    // =========================================================================

    @GetMapping("/courses")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List courses with pagination and filters")
    public ResponseEntity<ApiResponse<AdminPageResponse<AdminCourseDto>>> getCourses(
            @RequestParam(value = "universityId", required = false) Long universityId,
            @RequestParam(value = "collegeId", required = false) Long collegeId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "minEnrollments", required = false) Integer minEnrollments,
            @RequestParam(value = "minTopics", required = false) Integer minTopics,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "includeDeleted", defaultValue = "false") boolean includeDeleted,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Courses fetched successfully",
                adminService.getCourses(universityId, collegeId, status, minEnrollments, minTopics, search, includeDeleted, page, size)
        ));
    }

    @GetMapping("/courses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get course detail including topics and enrollment/report counts")
    public ResponseEntity<ApiResponse<AdminCourseDto>> getCourse(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Course detail fetched successfully", adminService.getCourseDetail(id)));
    }

    @PatchMapping("/courses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update course name, college, status, verified, or locked flags")
    public ResponseEntity<ApiResponse<AdminCourseDto>> updateCourse(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            @Valid @RequestBody AdminUpdateCourseRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Course updated successfully",
                adminService.updateCourse(actor, id, request, httpRequest)
        ));
    }

    @DeleteMapping("/courses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Soft-delete a course")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        adminService.softDeleteCourse(actor, id, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Course soft-deleted successfully", null));
    }

    @PostMapping("/courses/{id}/merge")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Merge duplicate source course {id} into targetCourseId transactionally and idempotently")
    public ResponseEntity<ApiResponse<AdminCourseDto>> mergeCourse(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            @Valid @RequestBody AdminUpdateCourseRequest.MergeRequest request,
            HttpServletRequest httpRequest) {
        AdminCourseDto merged = adminService.mergeCourse(actor, id, request.targetCourseId(), httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Course merged successfully", merged));
    }

    @PostMapping("/courses/{id}/reanalyze")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Trigger syllabus re-analysis for a course")
    public ResponseEntity<ApiResponse<AdminCourseDto>> reanalyzeCourse(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        AdminCourseDto updated = adminService.reanalyzeCourse(actor, id, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Course re-analysis triggered", updated));
    }

    @PatchMapping("/courses/{courseId}/topics/{topicId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Edit a topic's title, estimated hours, or order index")
    public ResponseEntity<ApiResponse<TopicDto>> updateTopic(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long courseId,
            @PathVariable Long topicId,
            @Valid @RequestBody AdminUpdateCourseRequest.UpdateTopicRequest request,
            HttpServletRequest httpRequest) {
        TopicDto updated = adminService.updateTopic(actor, courseId, topicId, request, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Topic updated successfully", updated));
    }

    @DeleteMapping("/courses/{courseId}/topics/{topicId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a topic from a course as admin")
    public ResponseEntity<ApiResponse<Void>> deleteTopic(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long courseId,
            @PathVariable Long topicId,
            HttpServletRequest httpRequest) {
        adminService.deleteTopicAsAdmin(actor, courseId, topicId, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Topic deleted successfully", null));
    }

    // Universities & Colleges CRUD

    @GetMapping("/universities")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AdminCatalogDtos.UniversityAdminDto>>> listUniversities() {
        return ResponseEntity.ok(ApiResponse.ok("Universities fetched successfully", adminService.listUniversities()));
    }

    @PostMapping("/universities")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminCatalogDtos.UniversityAdminDto>> createUniversity(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @Valid @RequestBody AdminCatalogDtos.UniversityWriteRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.ok(
                "University created successfully",
                adminService.createUniversity(actor, request, httpRequest)
        ));
    }

    @PatchMapping("/universities/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminCatalogDtos.UniversityAdminDto>> updateUniversity(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            @Valid @RequestBody AdminCatalogDtos.UniversityWriteRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.ok(
                "University updated successfully",
                adminService.updateUniversity(actor, id, request, httpRequest)
        ));
    }

    @DeleteMapping("/universities/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteUniversity(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        adminService.deleteUniversity(actor, id, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("University deleted successfully", null));
    }

    @GetMapping("/colleges")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AdminCatalogDtos.CollegeAdminDto>>> listColleges(
            @RequestParam(value = "universityId", required = false) Long universityId) {
        return ResponseEntity.ok(ApiResponse.ok("Colleges fetched successfully", adminService.listColleges(universityId)));
    }

    @PostMapping("/colleges")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminCatalogDtos.CollegeAdminDto>> createCollege(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @Valid @RequestBody AdminCatalogDtos.CollegeWriteRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.ok(
                "College created successfully",
                adminService.createCollege(actor, request, httpRequest)
        ));
    }

    @PatchMapping("/colleges/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AdminCatalogDtos.CollegeAdminDto>> updateCollege(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            @Valid @RequestBody AdminCatalogDtos.CollegeWriteRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.ok(
                "College updated successfully",
                adminService.updateCollege(actor, id, request, httpRequest)
        ));
    }

    @DeleteMapping("/colleges/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCollege(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        adminService.deleteCollege(actor, id, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("College deleted successfully", null));
    }

    // =========================================================================
    // 4. USERS MANAGEMENT (ADMIN only)
    // =========================================================================

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List users with pagination, search by name/email, and filters")
    public ResponseEntity<ApiResponse<AdminPageResponse<AdminUserDto>>> getUsers(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "universityId", required = false) Long universityId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Users fetched successfully",
                adminService.getUsers(search, role, status, universityId, page, size)
        ));
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get user detail projection (never exposes password hashes or tokens)")
    public ResponseEntity<ApiResponse<AdminUserDto>> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("User fetched successfully", adminService.getUserDetail(id)));
    }

    @PatchMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user role (enforces self-demotion and last-admin guards)")
    public ResponseEntity<ApiResponse<AdminUserDto>> updateUserRole(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            @Valid @RequestBody AdminUserDto.UpdateRoleRequest request,
            HttpServletRequest httpRequest) {
        AdminUserDto updated = adminService.updateUserRole(actor, id, request.role(), httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("User role updated successfully", updated));
    }

    @PatchMapping("/users/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update user account status (ACTIVE / SUSPENDED) and revoke refresh tokens if suspended")
    public ResponseEntity<ApiResponse<AdminUserDto>> updateUserStatus(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            @Valid @RequestBody AdminUserDto.UpdateStatusRequest request,
            HttpServletRequest httpRequest) {
        AdminUserDto updated = adminService.updateUserStatus(actor, id, request.status(), httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("User status updated successfully", updated));
    }

    @PostMapping("/users/{id}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Trigger forgot-password email flow and revoke existing refresh tokens")
    public ResponseEntity<ApiResponse<Void>> resetUserPassword(
            @AuthenticationPrincipal AuthenticatedUser actor,
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        adminService.triggerPasswordReset(actor, id, httpRequest);
        return ResponseEntity.ok(ApiResponse.ok("Password reset flow triggered and active sessions revoked", null));
    }

    // =========================================================================
    // 5. AUDIT LOG (ADMIN only, append-only)
    // =========================================================================

    @GetMapping("/audit-log")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List append-only admin audit log entries with filters and pagination")
    public ResponseEntity<ApiResponse<AdminPageResponse<AdminAuditLogDto>>> getAuditLogs(
            @RequestParam(value = "adminId", required = false) Long adminId,
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "targetType", required = false) String targetType,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Audit logs fetched successfully",
                auditService.getAuditLogs(adminId, action, targetType, search, page, size)
        ));
    }
}
