package com.studygenie.backend.service.admin;

import com.studygenie.backend.dto.admin.*;
import com.studygenie.backend.dto.auth.ForgotPasswordRequest;
import com.studygenie.backend.dto.syllabus.TopicDto;
import com.studygenie.backend.entity.*;
import com.studygenie.backend.entity.enums.AccountStatus;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.entity.enums.Role;
import com.studygenie.backend.exception.BadRequestException;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.repository.*;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.service.auth.AuthService;
import com.studygenie.backend.service.auth.RefreshTokenStore;
import com.studygenie.backend.service.browse.CourseService;
import jakarta.persistence.criteria.Predicate;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminManagementService {

    private static final Set<String> VALID_REPORT_STATUSES = Set.of("PENDING", "IN_REVIEW", "RESOLVED", "REJECTED");
    private static final List<String> OPEN_REPORT_STATUSES = List.of("PENDING", "IN_REVIEW");

    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final CollegeRepository collegeRepository;
    private final UniversityRepository universityRepository;
    private final SyllabusRepository syllabusRepository;
    private final TopicRepository topicRepository;
    private final StudyPlanRepository studyPlanRepository;
    private final PlanTaskRepository planTaskRepository;
    private final ExamRepository examRepository;
    private final CourseReportRepository courseReportRepository;
    private final CourseService courseService;
    private final AdminAccountGuardService accountGuardService;
    private final AdminAuditService auditService;
    private final AuthService authService;
    private final RefreshTokenStore refreshTokenStore;

    public AdminManagementService(
            StudentRepository studentRepository,
            CourseRepository courseRepository,
            CollegeRepository collegeRepository,
            UniversityRepository universityRepository,
            SyllabusRepository syllabusRepository,
            TopicRepository topicRepository,
            StudyPlanRepository studyPlanRepository,
            PlanTaskRepository planTaskRepository,
            ExamRepository examRepository,
            CourseReportRepository courseReportRepository,
            CourseService courseService,
            AdminAccountGuardService accountGuardService,
            AdminAuditService auditService,
            AuthService authService,
            RefreshTokenStore refreshTokenStore) {
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
        this.collegeRepository = collegeRepository;
        this.universityRepository = universityRepository;
        this.syllabusRepository = syllabusRepository;
        this.topicRepository = topicRepository;
        this.studyPlanRepository = studyPlanRepository;
        this.planTaskRepository = planTaskRepository;
        this.examRepository = examRepository;
        this.courseReportRepository = courseReportRepository;
        this.courseService = courseService;
        this.accountGuardService = accountGuardService;
        this.auditService = auditService;
        this.authService = authService;
        this.refreshTokenStore = refreshTokenStore;
    }

    // =========================================================================
    // 1. OVERVIEW
    // =========================================================================

    @Transactional(readOnly = true)
    public AdminOverviewDto getOverview() {
        LocalDate today = LocalDate.now();
        LocalDate sevenDaysAgoDate = today.minusDays(6);
        LocalDate fourteenDaysAgoDate = today.minusDays(13);
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime startOf7d = sevenDaysAgoDate.atStartOfDay();
        LocalDateTime startOf14d = fourteenDaysAgoDate.atStartOfDay();

        long totalUsers = studentRepository.count();
        long activeUsersToday = studentRepository.countByLastStudyDateGreaterThanEqual(today);
        long activeUsers7d = studentRepository.countByLastStudyDateGreaterThanEqual(sevenDaysAgoDate);
        long newSignupsToday = studentRepository.countByCreatedAtGreaterThanEqual(startOfToday);
        long newSignups7d = studentRepository.countByCreatedAtGreaterThanEqual(startOf7d);
        long totalCourses = courseRepository.countByDeletedAtIsNull();
        long enrolledCount = studentRepository.countAllEnrollments();
        long uploadsToday = syllabusRepository.countByCreatedAtGreaterThanEqual(startOfToday);
        long openReports = courseReportRepository.countByStatusIn(OPEN_REPORT_STATUSES);
        long failedAnalyses = courseRepository.countByStatusAndDeletedAtIsNull(CourseStatus.FAILED);

        List<Student> recentSignups = studentRepository.findByCreatedAtGreaterThanEqual(startOf14d);
        Map<LocalDate, Long> signupsByDay = recentSignups.stream()
                .filter(s -> s.getCreatedAt() != null)
                .collect(Collectors.groupingBy(s -> s.getCreatedAt().toLocalDate(), Collectors.counting()));

        List<Student> recentActive = studentRepository.findByLastStudyDateGreaterThanEqual(fourteenDaysAgoDate);
        Map<LocalDate, Long> activityByDay = recentActive.stream()
                .filter(s -> s.getLastStudyDate() != null)
                .collect(Collectors.groupingBy(Student::getLastStudyDate, Collectors.counting()));

        List<AdminOverviewDto.DailyMetricPoint> dailySignups = new ArrayList<>();
        List<AdminOverviewDto.DailyMetricPoint> dailyActivity = new ArrayList<>();

        for (int i = 13; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            String key = d.toString();
            dailySignups.add(new AdminOverviewDto.DailyMetricPoint(key, signupsByDay.getOrDefault(d, 0L)));
            dailyActivity.add(new AdminOverviewDto.DailyMetricPoint(key, activityByDay.getOrDefault(d, 0L)));
        }

        return new AdminOverviewDto(
                totalUsers,
                activeUsersToday,
                activeUsers7d,
                newSignupsToday,
                newSignups7d,
                totalCourses,
                enrolledCount,
                uploadsToday,
                openReports,
                failedAnalyses,
                dailySignups,
                dailyActivity
        );
    }

    // =========================================================================
    // 2. REPORTS
    // =========================================================================

    @Transactional(readOnly = true)
    public AdminPageResponse<AdminReportDto> getReports(
            String status,
            String reason,
            Long courseId,
            String search,
            int page,
            int size) {

        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));

        Specification<CourseReport> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("status")), status.trim().toUpperCase(Locale.ROOT)));
            }
            if (reason != null && !reason.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("reason")), "%" + reason.trim().toLowerCase(Locale.ROOT) + "%"));
            }
            if (courseId != null) {
                predicates.add(cb.equal(root.get("courseId"), courseId));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("courseName")), pattern),
                        cb.like(cb.lower(root.get("reportedBy")), pattern),
                        cb.like(cb.lower(root.get("details")), pattern),
                        cb.like(cb.lower(root.get("reason")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<CourseReport> result = courseReportRepository.findAll(
                spec,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt", "id"))
        );

        List<AdminReportDto> items = result.getContent().stream().map(this::toReportDto).toList();
        return new AdminPageResponse<>(items, result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public AdminReportDto getReport(Long id) {
        CourseReport report = courseReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));
        return toReportDto(report);
    }

    @Transactional
    public AdminReportDto updateReport(
            AuthenticatedUser actor,
            Long id,
            AdminUpdateReportRequest req,
            HttpServletRequest httpReq) {

        CourseReport report = courseReportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));

        AdminReportDto before = toReportDto(report);

        if (req.status() != null && !req.status().isBlank()) {
            String normalizedStatus = req.status().trim().toUpperCase(Locale.ROOT);
            if (!VALID_REPORT_STATUSES.contains(normalizedStatus)) {
                throw new BadRequestException("Invalid report status. Must be one of: PENDING, IN_REVIEW, RESOLVED, REJECTED");
            }
            report.setStatus(normalizedStatus);
            if ("RESOLVED".equals(normalizedStatus) || "REJECTED".equals(normalizedStatus)) {
                report.setResolvedById(actor != null ? actor.id() : null);
                report.setResolvedBy(actor != null ? actor.email() : "admin");
                report.setResolvedAt(LocalDateTime.now());
            } else {
                report.setResolvedById(null);
                report.setResolvedBy(null);
                report.setResolvedAt(null);
            }
        }

        if (req.adminNote() != null) {
            report.setAdminNote(req.adminNote().trim());
        }
        report.setUpdatedAt(LocalDateTime.now());

        CourseReport saved = courseReportRepository.saveAndFlush(report);
        AdminReportDto after = toReportDto(saved);

        auditService.record(actor, "UPDATE_REPORT", "COURSE_REPORT", id, before, after, httpReq);
        return after;
    }

    private AdminReportDto toReportDto(CourseReport r) {
        String courseCode = null;
        String universityName = null;
        if (r.getCourseId() != null) {
            Course c = courseRepository.findById(r.getCourseId()).orElse(null);
            if (c != null) {
                courseCode = "CS " + c.getId();
                if (c.getCollege() != null && c.getCollege().getUniversity() != null) {
                    universityName = c.getCollege().getUniversity().getName();
                }
            }
        }

        String studentName = null;
        String studentEmail = null;
        Long studentId = null;

        if (r.getReportedBy() != null && !r.getReportedBy().isBlank()) {
            String rep = r.getReportedBy().trim();
            if (rep.contains("(") && rep.endsWith(")")) {
                int open = rep.lastIndexOf('(');
                studentName = rep.substring(0, open).trim();
                studentEmail = rep.substring(open + 1, rep.length() - 1).trim();
            } else if (rep.contains("@")) {
                studentEmail = rep;
            } else {
                studentName = rep;
            }

            Student matched = null;
            if (studentEmail != null) {
                matched = studentRepository.findByEmailIgnoreCase(studentEmail).orElse(null);
            }
            if (matched == null && studentName != null) {
                matched = studentRepository.findFirstByFullNameIgnoreCase(studentName).orElse(null);
            }
            if (matched == null) {
                final String sName = studentName;
                final String sEmail = studentEmail;
                matched = studentRepository.findAll().stream()
                        .filter(st -> (sEmail != null && sEmail.equalsIgnoreCase(st.getEmail()))
                                   || (sName != null && sName.equalsIgnoreCase(st.getFullName()))
                                   || rep.equalsIgnoreCase(st.getEmail())
                                   || rep.equalsIgnoreCase(st.getFullName()))
                        .findFirst()
                        .orElse(null);
            }

            if (matched != null) {
                studentId = matched.getId();
                if (matched.getFullName() != null && !matched.getFullName().isBlank()) {
                    studentName = matched.getFullName();
                }
                if (matched.getEmail() != null && !matched.getEmail().isBlank()) {
                    studentEmail = matched.getEmail();
                }
            }
        }

        String reportedByDisplay = (studentName != null && studentEmail != null)
                ? studentName + " (" + studentEmail + ")"
                : (studentName != null ? studentName : (studentEmail != null ? studentEmail : r.getReportedBy()));

        String resolvedByName = null;
        String resolvedByEmail = null;
        if (r.getResolvedById() != null) {
            Student admin = studentRepository.findById(r.getResolvedById()).orElse(null);
            if (admin != null) {
                resolvedByName = admin.getFullName();
                resolvedByEmail = admin.getEmail();
            }
        }
        if (resolvedByName == null) {
            resolvedByName = r.getResolvedBy();
        }
        if (resolvedByEmail == null) {
            resolvedByEmail = r.getResolvedBy();
        }

        return new AdminReportDto(
                r.getId(),
                r.getCourseId(),
                courseCode,
                r.getCourseName(),
                universityName,
                studentId,
                studentName,
                studentEmail,
                reportedByDisplay,
                r.getReason(),
                r.getDetails(),
                r.getDetails(),
                r.getStatus() != null ? r.getStatus() : "PENDING",
                r.getAdminNote(),
                r.getResolvedById(),
                r.getResolvedBy(),
                resolvedByName,
                resolvedByEmail,
                r.getResolvedAt(),
                r.getUpdatedAt(),
                r.getCreatedAt()
        );
    }

    // =========================================================================
    // 3. COURSES, MERGE, RE-ANALYZE, TOPICS & CATALOG CRUD
    // =========================================================================

    @Transactional(readOnly = true)
    public AdminPageResponse<AdminCourseDto> getCourses(
            Long universityId,
            Long collegeId,
            String status,
            Integer minEnrollments,
            Integer minTopics,
            String search,
            boolean includeDeleted,
            int page,
            int size) {

        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));

        Specification<Course> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (!includeDeleted) {
                predicates.add(cb.isNull(root.get("deletedAt")));
            }
            if (collegeId != null) {
                predicates.add(cb.equal(root.get("college").get("id"), collegeId));
            }
            if (universityId != null) {
                predicates.add(cb.equal(root.get("college").get("university").get("id"), universityId));
            }
            if (status != null && !status.isBlank()) {
                try {
                    CourseStatus cs = CourseStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
                    predicates.add(cb.equal(root.get("status"), cs));
                } catch (IllegalArgumentException ex) {
                    throw new BadRequestException("Invalid course status: " + status);
                }
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.like(cb.lower(root.get("name")), pattern));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Course> pageResult = courseRepository.findAll(
                spec,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt", "id"))
        );

        List<AdminCourseDto> items = pageResult.getContent().stream()
                .map(c -> toCourseDto(c, false))
                .filter(dto -> (minEnrollments == null || dto.enrollmentCount() >= minEnrollments)
                        && (minTopics == null || dto.topicCount() >= minTopics))
                .toList();

        return new AdminPageResponse<>(
                items,
                pageResult.getNumber(),
                pageResult.getSize(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public AdminCourseDto getCourseDetail(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));
        return toCourseDto(course, true);
    }

    @Transactional
    public AdminCourseDto updateCourse(
            AuthenticatedUser actor,
            Long id,
            AdminUpdateCourseRequest req,
            HttpServletRequest httpReq) {

        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));

        AdminCourseDto before = toCourseDto(course, false);

        if (req.name() != null && !req.name().isBlank()) {
            course.setName(req.name().trim());
        }
        if (req.collegeId() != null) {
            College college = collegeRepository.findById(req.collegeId())
                    .orElseThrow(() -> new ResourceNotFoundException("College not found with id: " + req.collegeId()));
            course.setCollege(college);
        }
        if (req.status() != null && !req.status().isBlank()) {
            try {
                course.setStatus(CourseStatus.valueOf(req.status().trim().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Invalid course status: " + req.status());
            }
        }
        if (req.verified() != null) {
            course.setVerified(req.verified());
        }
        if (req.locked() != null) {
            course.setLocked(req.locked());
        }

        Course saved = courseRepository.saveAndFlush(course);
        courseService.clearCoursesCache();
        AdminCourseDto after = toCourseDto(saved, true);

        auditService.record(actor, "UPDATE_COURSE", "COURSE", id, before, after, httpReq);
        return after;
    }

    @Transactional
    public void softDeleteCourse(AuthenticatedUser actor, Long id, HttpServletRequest httpReq) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));

        AdminCourseDto before = toCourseDto(course, false);
        course.setDeletedAt(LocalDateTime.now());
        Course saved = courseRepository.saveAndFlush(course);
        courseService.clearCoursesCache();

        auditService.record(actor, "DELETE_COURSE", "COURSE", id, before, toCourseDto(saved, false), httpReq);
    }

    @Transactional
    public AdminCourseDto mergeCourse(
            AuthenticatedUser actor,
            Long sourceCourseId,
            Long targetCourseId,
            HttpServletRequest httpReq) {

        if (sourceCourseId == null || targetCourseId == null) {
            throw new BadRequestException("Both source and target course IDs are required");
        }
        if (sourceCourseId.equals(targetCourseId)) {
            throw new BadRequestException("Cannot merge a course into itself");
        }

        Course source = courseRepository.findById(sourceCourseId)
                .orElseThrow(() -> new ResourceNotFoundException("Source course not found: " + sourceCourseId));
        Course target = courseRepository.findById(targetCourseId)
                .orElseThrow(() -> new ResourceNotFoundException("Target course not found: " + targetCourseId));

        if (target.isDeleted()) {
            throw new BadRequestException("Cannot merge into a deleted target course");
        }

        Map<String, Object> beforeSummary = Map.of(
                "sourceCourseId", source.getId(),
                "sourceCourseName", source.getName(),
                "targetCourseId", target.getId(),
                "targetCourseName", target.getName(),
                "sourceAlreadyDeleted", source.isDeleted()
        );

        // 1. Move student enrollments from source -> target (idempotent)
        List<Long> enrolledStudentIds = studentRepository.findStudentIdsEnrolledInCourse(sourceCourseId);
        int movedEnrollments = 0;
        for (Long studentId : enrolledStudentIds) {
            Student student = studentRepository.findById(studentId).orElse(null);
            if (student != null && student.getEnrolledCourses() != null) {
                student.getEnrolledCourses().remove(source);
                student.getEnrolledCourses().add(target);
                studentRepository.save(student);
                movedEnrollments++;
            }
        }

        // 2. Move topics from source syllabus -> target syllabus (deduplicated by title)
        Syllabus sourceSyllabus = syllabusRepository.findByCourseId(sourceCourseId).orElse(source.getSyllabus());
        Syllabus targetSyllabus = syllabusRepository.findByCourseId(targetCourseId).orElse(target.getSyllabus());
        int movedTopics = 0;

        if (sourceSyllabus != null) {
            List<Topic> sourceTopics = topicRepository.findBySyllabusId(sourceSyllabus.getId());
            if (!sourceTopics.isEmpty()) {
                if (targetSyllabus == null) {
                    targetSyllabus = Syllabus.builder()
                            .course(target)
                            .originalPdfPath(sourceSyllabus.getOriginalPdfPath())
                            .uploadedBy(sourceSyllabus.getUploadedBy())
                            .createdAt(LocalDateTime.now())
                            .build();
                    targetSyllabus = syllabusRepository.saveAndFlush(targetSyllabus);
                    target.setSyllabus(targetSyllabus);
                }

                List<Topic> targetTopics = topicRepository.findBySyllabusId(targetSyllabus.getId());
                Set<String> existingTitles = targetTopics.stream()
                        .map(t -> t.getChapterTitle() != null ? t.getChapterTitle().trim().toLowerCase(Locale.ROOT) : "")
                        .collect(Collectors.toSet());
                int nextOrder = targetTopics.stream().mapToInt(Topic::getOrderIndex).max().orElse(0) + 1;

                for (Topic st : sourceTopics) {
                    String normTitle = st.getChapterTitle() != null ? st.getChapterTitle().trim().toLowerCase(Locale.ROOT) : "";
                    if (!existingTitles.contains(normTitle)) {
                        st.setSyllabus(targetSyllabus);
                        st.setOrderIndex(nextOrder++);
                        topicRepository.save(st);
                        existingTitles.add(normTitle);
                        movedTopics++;
                    }
                }
                target.setStatus(CourseStatus.READY);
            }
        }

        // 3. Move study plans from source -> target
        List<StudyPlan> sourcePlans = studyPlanRepository.findByCourseId(sourceCourseId);
        int movedPlans = 0;
        for (StudyPlan sp : sourcePlans) {
            Long sid = sp.getStudent() != null ? sp.getStudent().getId() : null;
            Optional<StudyPlan> existingTargetPlan = sid != null
                    ? studyPlanRepository.findByStudentIdAndCourseId(sid, targetCourseId)
                    : Optional.empty();
            if (existingTargetPlan.isEmpty()) {
                sp.setCourse(target);
                studyPlanRepository.save(sp);
                movedPlans++;
            } else {
                List<PlanTask> tasks = planTaskRepository.findByStudyPlanId(sp.getId());
                if (!tasks.isEmpty()) {
                    planTaskRepository.deleteAll(tasks);
                }
                studyPlanRepository.delete(sp);
            }
        }

        // 4. Move exams from source -> target
        List<Exam> examsById = examRepository.findByCourseId(sourceCourseId);
        List<Exam> examsByName = examRepository.findByCourseIgnoreCase(source.getName());
        Set<Exam> allSourceExams = new LinkedHashSet<>(examsById);
        allSourceExams.addAll(examsByName);
        for (Exam exam : allSourceExams) {
            exam.setCourseId(target.getId());
            exam.setCourse(target.getName());
            examRepository.save(exam);
        }

        // 5. Move course reports from source -> target
        List<CourseReport> reportsById = courseReportRepository.findByCourseId(sourceCourseId);
        List<CourseReport> reportsByName = courseReportRepository.findByCourseNameIgnoreCase(source.getName());
        Set<CourseReport> allSourceReports = new LinkedHashSet<>(reportsById);
        allSourceReports.addAll(reportsByName);
        for (CourseReport report : allSourceReports) {
            report.setCourseId(target.getId());
            report.setCourseName(target.getName());
            courseReportRepository.save(report);
        }

        // 6. Soft-delete source course
        if (source.getDeletedAt() == null) {
            source.setDeletedAt(LocalDateTime.now());
        }
        courseRepository.saveAndFlush(source);
        Course savedTarget = courseRepository.saveAndFlush(target);
        courseService.clearCoursesCache();

        Map<String, Object> afterSummary = Map.of(
                "sourceCourseId", source.getId(),
                "targetCourseId", savedTarget.getId(),
                "movedEnrollments", movedEnrollments,
                "movedTopics", movedTopics,
                "movedPlans", movedPlans,
                "movedExams", allSourceExams.size(),
                "movedReports", allSourceReports.size()
        );

        auditService.record(actor, "MERGE_COURSE", "COURSE", sourceCourseId + "->" + targetCourseId, beforeSummary, afterSummary, httpReq);
        return toCourseDto(savedTarget, true);
    }

    @Transactional
    public AdminCourseDto reanalyzeCourse(AuthenticatedUser actor, Long courseId, HttpServletRequest httpReq) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));

        AdminCourseDto before = toCourseDto(course, false);
        Syllabus syllabus = syllabusRepository.findByCourseId(courseId).orElse(course.getSyllabus());
        if (syllabus != null && !topicRepository.findBySyllabusId(syllabus.getId()).isEmpty()) {
            course.setStatus(CourseStatus.READY);
        } else {
            course.setStatus(CourseStatus.NO_SYLLABUS);
        }
        Course saved = courseRepository.saveAndFlush(course);
        courseService.clearCoursesCache();
        AdminCourseDto after = toCourseDto(saved, true);

        auditService.record(actor, "REANALYZE_COURSE", "COURSE", courseId, before, after, httpReq);
        return after;
    }

    @Transactional
    public TopicDto updateTopic(
            AuthenticatedUser actor,
            Long courseId,
            Long topicId,
            AdminUpdateCourseRequest.UpdateTopicRequest req,
            HttpServletRequest httpReq) {

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + courseId));
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic not found with id: " + topicId));

        if (topic.getSyllabus() == null || !topic.getSyllabus().getCourse().getId().equals(course.getId())) {
            throw new BadRequestException("Topic does not belong to the specified course");
        }

        TopicDto before = new TopicDto(topic.getId(), topic.getChapterTitle(), topic.getOrderIndex(), topic.getEstimatedHours(), topic.getContentExcerpt());

        if (req.chapterTitle() != null && !req.chapterTitle().isBlank()) {
            topic.setChapterTitle(req.chapterTitle().trim());
        }
        if (req.estimatedHours() != null && req.estimatedHours() >= 0.5) {
            topic.setEstimatedHours(req.estimatedHours());
        }
        if (req.orderIndex() != null && req.orderIndex() >= 1) {
            topic.setOrderIndex(req.orderIndex());
        }

        Topic saved = topicRepository.saveAndFlush(topic);
        TopicDto after = new TopicDto(saved.getId(), saved.getChapterTitle(), saved.getOrderIndex(), saved.getEstimatedHours(), saved.getContentExcerpt());

        auditService.record(actor, "UPDATE_TOPIC", "TOPIC", topicId, before, after, httpReq);
        return after;
    }

    @Transactional
    public void deleteTopicAsAdmin(AuthenticatedUser actor, Long courseId, Long topicId, HttpServletRequest httpReq) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new ResourceNotFoundException("Topic not found with id: " + topicId));
        TopicDto before = new TopicDto(topic.getId(), topic.getChapterTitle(), topic.getOrderIndex(), topic.getEstimatedHours(), topic.getContentExcerpt());
        courseService.deleteTopic(courseId, topicId);
        auditService.record(actor, "DELETE_TOPIC", "TOPIC", topicId, before, null, httpReq);
    }

    private AdminCourseDto toCourseDto(Course c, boolean includeTopics) {
        College col = c.getCollege();
        University uni = col != null ? col.getUniversity() : null;
        long enrollments = studentRepository.countEnrolledStudentsByCourseId(c.getId());
        long openReports = courseReportRepository.countByCourseIdAndStatusIn(c.getId(), OPEN_REPORT_STATUSES);

        List<TopicDto> topics = List.of();
        int topicCount = 0;
        Syllabus syl = syllabusRepository.findByCourseId(c.getId()).orElse(c.getSyllabus());
        if (syl != null) {
            List<Topic> rawTopics = topicRepository.findBySyllabusId(syl.getId());
            topicCount = rawTopics.size();
            if (includeTopics) {
                topics = rawTopics.stream()
                        .sorted(Comparator.comparingInt(Topic::getOrderIndex))
                        .map(t -> new TopicDto(t.getId(), t.getChapterTitle(), t.getOrderIndex(), t.getEstimatedHours(), t.getContentExcerpt()))
                        .toList();
            }
        }

        return new AdminCourseDto(
                c.getId(),
                c.getName(),
                col != null ? col.getId() : null,
                col != null ? col.getName() : null,
                uni != null ? uni.getId() : null,
                uni != null ? uni.getName() : null,
                c.getStatus() != null ? c.getStatus().name() : CourseStatus.NO_SYLLABUS.name(),
                c.isVerified(),
                c.isLocked(),
                c.getDeletedAt(),
                enrollments,
                topicCount,
                openReports,
                c.getCreatedAt(),
                topics
        );
    }

    // Universities & Colleges CRUD

    @Transactional(readOnly = true)
    public List<AdminCatalogDtos.UniversityAdminDto> listUniversities() {
        List<University> universities = universityRepository.findAll(Sort.by(Sort.Direction.ASC, "name"));
        return universities.stream().map(u -> {
            List<College> colleges = collegeRepository.findByUniversityId(u.getId());
            long courseCount = colleges.stream()
                    .mapToLong(col -> courseRepository.findByCollegeId(col.getId()).stream().filter(c -> !c.isDeleted()).count())
                    .sum();
            return new AdminCatalogDtos.UniversityAdminDto(u.getId(), u.getName(), u.getCity(), colleges.size(), courseCount);
        }).toList();
    }

    @Transactional
    public AdminCatalogDtos.UniversityAdminDto createUniversity(
            AuthenticatedUser actor,
            AdminCatalogDtos.UniversityWriteRequest req,
            HttpServletRequest httpReq) {
        String trimmedCity = (req.city() != null && !req.city().trim().isEmpty()) ? req.city().trim() : null;
        University u = University.builder()
                .name(req.name().trim())
                .city(trimmedCity)
                .build();
        u = universityRepository.saveAndFlush(u);
        AdminCatalogDtos.UniversityAdminDto dto = new AdminCatalogDtos.UniversityAdminDto(u.getId(), u.getName(), u.getCity(), 0, 0);
        auditService.record(actor, "CREATE_UNIVERSITY", "UNIVERSITY", u.getId(), null, dto, httpReq);
        return dto;
    }

    @Transactional
    public AdminCatalogDtos.UniversityAdminDto updateUniversity(
            AuthenticatedUser actor,
            Long id,
            AdminCatalogDtos.UniversityWriteRequest req,
            HttpServletRequest httpReq) {
        University u = universityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("University not found: " + id));
        String beforeName = u.getName();
        String beforeCity = u.getCity();
        u.setName(req.name().trim());
        if (req.city() != null) {
            u.setCity(req.city().trim().isEmpty() ? null : req.city().trim());
        }
        u = universityRepository.saveAndFlush(u);
        List<College> colleges = collegeRepository.findByUniversityId(u.getId());
        long courseCount = colleges.stream()
                .mapToLong(col -> courseRepository.findByCollegeId(col.getId()).stream().filter(c -> !c.isDeleted()).count())
                .sum();
        AdminCatalogDtos.UniversityAdminDto dto = new AdminCatalogDtos.UniversityAdminDto(u.getId(), u.getName(), u.getCity(), colleges.size(), courseCount);
        auditService.record(actor, "UPDATE_UNIVERSITY", "UNIVERSITY", u.getId(), Map.of("name", beforeName, "city", beforeCity == null ? "" : beforeCity), dto, httpReq);
        return dto;
    }

    @Transactional
    public void deleteUniversity(AuthenticatedUser actor, Long id, HttpServletRequest httpReq) {
        University u = universityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("University not found: " + id));
        if (!collegeRepository.findByUniversityId(id).isEmpty()) {
            throw new BadRequestException("Cannot delete a university that still has colleges");
        }
        universityRepository.delete(u);
        auditService.record(actor, "DELETE_UNIVERSITY", "UNIVERSITY", id, Map.of("id", id, "name", u.getName()), null, httpReq);
    }

    @Transactional(readOnly = true)
    public List<AdminCatalogDtos.CollegeAdminDto> listColleges(Long universityId) {
        List<College> colleges = universityId != null
                ? collegeRepository.findByUniversityId(universityId)
                : collegeRepository.findAll(Sort.by(Sort.Direction.ASC, "name"));
        return colleges.stream().map(c -> {
            long courseCount = courseRepository.findByCollegeId(c.getId()).stream().filter(cr -> !cr.isDeleted()).count();
            University u = c.getUniversity();
            return new AdminCatalogDtos.CollegeAdminDto(
                    c.getId(),
                    c.getName(),
                    u != null ? u.getId() : null,
                    u != null ? u.getName() : null,
                    courseCount
            );
        }).toList();
    }

    @Transactional
    public AdminCatalogDtos.CollegeAdminDto createCollege(
            AuthenticatedUser actor,
            AdminCatalogDtos.CollegeWriteRequest req,
            HttpServletRequest httpReq) {
        University u = universityRepository.findById(req.universityId())
                .orElseThrow(() -> new ResourceNotFoundException("University not found: " + req.universityId()));
        College c = College.builder().name(req.name().trim()).university(u).build();
        c = collegeRepository.saveAndFlush(c);
        AdminCatalogDtos.CollegeAdminDto dto = new AdminCatalogDtos.CollegeAdminDto(c.getId(), c.getName(), u.getId(), u.getName(), 0);
        auditService.record(actor, "CREATE_COLLEGE", "COLLEGE", c.getId(), null, dto, httpReq);
        return dto;
    }

    @Transactional
    public AdminCatalogDtos.CollegeAdminDto updateCollege(
            AuthenticatedUser actor,
            Long id,
            AdminCatalogDtos.CollegeWriteRequest req,
            HttpServletRequest httpReq) {
        College c = collegeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("College not found: " + id));
        String beforeName = c.getName();
        if (req.universityId() != null) {
            University u = universityRepository.findById(req.universityId())
                    .orElseThrow(() -> new ResourceNotFoundException("University not found: " + req.universityId()));
            c.setUniversity(u);
        }
        c.setName(req.name().trim());
        c = collegeRepository.saveAndFlush(c);
        University u = c.getUniversity();
        AdminCatalogDtos.CollegeAdminDto dto = new AdminCatalogDtos.CollegeAdminDto(
                c.getId(), c.getName(), u != null ? u.getId() : null, u != null ? u.getName() : null, 0);
        auditService.record(actor, "UPDATE_COLLEGE", "COLLEGE", c.getId(), Map.of("name", beforeName), dto, httpReq);
        return dto;
    }

    @Transactional
    public void deleteCollege(AuthenticatedUser actor, Long id, HttpServletRequest httpReq) {
        College c = collegeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("College not found: " + id));
        if (!courseRepository.findByCollegeId(id).isEmpty()) {
            throw new BadRequestException("Cannot delete a college that still has courses");
        }
        collegeRepository.delete(c);
        auditService.record(actor, "DELETE_COLLEGE", "COLLEGE", id, Map.of("id", id, "name", c.getName()), null, httpReq);
    }

    // =========================================================================
    // 4. USERS MANAGEMENT
    // =========================================================================

    @Transactional(readOnly = true)
    public AdminPageResponse<AdminUserDto> getUsers(
            String search,
            String role,
            String status,
            Long universityId,
            int page,
            int size) {

        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));

        Specification<Student> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern)
                ));
            }
            if (role != null && !role.isBlank()) {
                try {
                    Role r = Role.valueOf(role.trim().toUpperCase(Locale.ROOT));
                    predicates.add(cb.equal(root.get("role"), r));
                } catch (IllegalArgumentException ex) {
                    throw new BadRequestException("Invalid role filter: " + role);
                }
            }
            if (status != null && !status.isBlank()) {
                try {
                    AccountStatus st = AccountStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
                    predicates.add(cb.equal(root.get("status"), st));
                } catch (IllegalArgumentException ex) {
                    throw new BadRequestException("Invalid status filter: " + status);
                }
            }
            if (universityId != null) {
                predicates.add(cb.equal(root.get("university").get("id"), universityId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Student> pageResult = studentRepository.findAll(
                spec,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt", "id"))
        );

        List<AdminUserDto> items = pageResult.getContent().stream().map(this::toUserDto).toList();
        return new AdminPageResponse<>(
                items,
                pageResult.getNumber(),
                pageResult.getSize(),
                pageResult.getTotalElements(),
                pageResult.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public AdminUserDto getUserDetail(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return toUserDto(student);
    }

    @Transactional
    public AdminUserDto updateUserRole(
            AuthenticatedUser actor,
            Long targetUserId,
            String roleStr,
            HttpServletRequest httpReq) {

        Role newRole;
        try {
            newRole = Role.valueOf(roleStr.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BadRequestException("Invalid role. Must be one of: STUDENT, MODERATOR, ADMIN");
        }

        Student existing = studentRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));
        String beforeRole = existing.getRole().name();

        Student updated = accountGuardService.changeUserRole(actor != null ? actor.id() : null, targetUserId, newRole);
        AdminUserDto dto = toUserDto(updated);

        auditService.record(
                actor,
                "UPDATE_USER_ROLE",
                "USER",
                targetUserId,
                Map.of("role", beforeRole),
                Map.of("role", updated.getRole().name()),
                httpReq
        );
        return dto;
    }

    @Transactional
    public AdminUserDto updateUserStatus(
            AuthenticatedUser actor,
            Long targetUserId,
            String statusStr,
            HttpServletRequest httpReq) {

        AccountStatus newStatus;
        try {
            newStatus = AccountStatus.valueOf(statusStr.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            throw new BadRequestException("Invalid status. Must be one of: ACTIVE, SUSPENDED");
        }

        Student existing = studentRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));
        String beforeStatus = existing.getStatus().name();

        Student updated = accountGuardService.changeUserStatus(actor != null ? actor.id() : null, targetUserId, newStatus);
        AdminUserDto dto = toUserDto(updated);

        auditService.record(
                actor,
                "UPDATE_USER_STATUS",
                "USER",
                targetUserId,
                Map.of("status", beforeStatus),
                Map.of("status", updated.getStatus().name()),
                httpReq
        );
        return dto;
    }

    @Transactional
    public void triggerPasswordReset(
            AuthenticatedUser actor,
            Long targetUserId,
            HttpServletRequest httpReq) {

        Student target = studentRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        authService.forgotPassword(new ForgotPasswordRequest(target.getEmail()));
        refreshTokenStore.revokeAllForUser(targetUserId);

        auditService.record(
                actor,
                "TRIGGER_PASSWORD_RESET",
                "USER",
                targetUserId,
                null,
                Map.of("email", target.getEmail(), "refreshTokensRevoked", true),
                httpReq
        );
    }

    private AdminUserDto toUserDto(Student s) {
        University uni = s.getUniversity();
        long enrolledCount = studentRepository.countEnrolledCoursesByStudentId(s.getId());
        return new AdminUserDto(
                s.getId(),
                s.getFullName(),
                s.getEmail(),
                s.getRole().name(),
                s.getStatus().name(),
                uni != null ? uni.getId() : null,
                uni != null ? uni.getName() : null,
                s.getAuthProvider() != null ? s.getAuthProvider() : "LOCAL",
                enrolledCount,
                s.getGeniePoints() != null ? s.getGeniePoints() : 0,
                s.getStreakCount() != null ? s.getStreakCount() : 0,
                s.getLongestStreakDays() != null ? s.getLongestStreakDays() : 0,
                s.getLastStudyDate(),
                s.getLastActiveAt(),
                s.getCreatedAt()
        );
    }
}
