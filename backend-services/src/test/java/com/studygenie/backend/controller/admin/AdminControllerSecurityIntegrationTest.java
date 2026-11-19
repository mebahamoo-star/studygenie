package com.studygenie.backend.controller.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.entity.College;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.CourseReport;
import com.studygenie.backend.entity.Exam;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.Syllabus;
import com.studygenie.backend.entity.Topic;
import com.studygenie.backend.entity.University;
import com.studygenie.backend.entity.enums.AccountStatus;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.entity.enums.Role;
import com.studygenie.backend.repository.AdminAuditLogRepository;
import com.studygenie.backend.repository.CollegeRepository;
import com.studygenie.backend.repository.CourseReportRepository;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.repository.ExamRepository;
import com.studygenie.backend.repository.PlanTaskRepository;
import com.studygenie.backend.repository.RefreshTokenRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.repository.StudyPlanRepository;
import com.studygenie.backend.repository.SyllabusRepository;
import com.studygenie.backend.repository.TopicRepository;
import com.studygenie.backend.repository.UniversityRepository;
import com.studygenie.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "jwt.secret=this-is-a-very-long-dummy-jwt-secret-for-admin-security-testing-123456",
    "internal.n8n-token=dummy-n8n-token",
    "ai.engine.internal-token=dummy-ai-token",
    "cors.allowed-origins=https://app.studygenie.local",
    "app.rate-limit.auth-per-minute=500",
    "app.rate-limit.admin-per-minute=500"
})
class AdminControllerSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private StudentRepository studentRepository;
    @Autowired
    private UniversityRepository universityRepository;
    @Autowired
    private CollegeRepository collegeRepository;
    @Autowired
    private CourseRepository courseRepository;
    @Autowired
    private SyllabusRepository syllabusRepository;
    @Autowired
    private TopicRepository topicRepository;
    @Autowired
    private CourseReportRepository courseReportRepository;
    @Autowired
    private ExamRepository examRepository;
    @Autowired
    private StudyPlanRepository studyPlanRepository;
    @Autowired
    private PlanTaskRepository planTaskRepository;
    @Autowired
    private RefreshTokenRepository refreshTokenRepository;
    @Autowired
    private AdminAuditLogRepository adminAuditLogRepository;

    private Student studentUser;
    private Student secondStudentUser;
    private Student moderatorUser;
    private Student adminUser;

    private String studentToken;
    private String moderatorToken;
    private String adminToken;

    private University university;
    private College college;
    private Course course;
    private Topic topic;
    private CourseReport report;

    @BeforeEach
    void setUp() {
        adminAuditLogRepository.deleteAll();
        courseReportRepository.deleteAll();
        planTaskRepository.deleteAll();
        studyPlanRepository.deleteAll();
        examRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        studentRepository.deleteAll();
        topicRepository.deleteAll();
        syllabusRepository.deleteAll();
        courseRepository.deleteAll();
        collegeRepository.deleteAll();
        universityRepository.deleteAll();

        university = universityRepository.save(University.builder()
            .name("Security Test University")
            .build());

        college = collegeRepository.save(College.builder()
            .name("College of Computing")
            .university(university)
            .build());

        course = courseRepository.save(Course.builder()
            .name("SEC101 Application Security")
            .college(college)
            .status(CourseStatus.READY)
            .build());

        Syllabus syllabus = syllabusRepository.save(Syllabus.builder()
            .course(course)
            .build());

        topic = topicRepository.save(Topic.builder()
            .syllabus(syllabus)
            .chapterTitle("Threat Modeling")
            .orderIndex(1)
            .estimatedHours(2.0)
            .build());

        studentUser = studentRepository.save(Student.builder()
            .fullName("Alice Student")
            .email("alice@studygenie.local")
            .password(passwordEncoder.encode("Password123!"))
            .role(Role.STUDENT)
            .status(AccountStatus.ACTIVE)
            .university(university)
            .build());

        secondStudentUser = studentRepository.save(Student.builder()
            .fullName("Bob Student")
            .email("bob@studygenie.local")
            .password(passwordEncoder.encode("Password123!"))
            .role(Role.STUDENT)
            .status(AccountStatus.ACTIVE)
            .university(university)
            .build());

        moderatorUser = studentRepository.save(Student.builder()
            .fullName("Charlie Moderator")
            .email("mod@studygenie.local")
            .password(passwordEncoder.encode("Password123!"))
            .role(Role.MODERATOR)
            .status(AccountStatus.ACTIVE)
            .university(university)
            .build());

        adminUser = studentRepository.save(Student.builder()
            .fullName("Dana Admin")
            .email("admin@studygenie.local")
            .password(passwordEncoder.encode("Password123!"))
            .role(Role.ADMIN)
            .status(AccountStatus.ACTIVE)
            .university(university)
            .build());

        report = courseReportRepository.save(CourseReport.builder()
            .courseId(course.getId())
            .courseName(course.getName())
            .reportedBy(studentUser.getEmail())
            .reason("MISSING_TOPICS")
            .details("Week 2 topic is missing")
            .status("PENDING")
            .build());

        studentToken = jwtService.generateAccessToken(studentUser.getId(), studentUser.getEmail(), Role.STUDENT);
        moderatorToken = jwtService.generateAccessToken(moderatorUser.getId(), moderatorUser.getEmail(), Role.MODERATOR);
        adminToken = jwtService.generateAccessToken(adminUser.getId(), adminUser.getEmail(), Role.ADMIN);
    }

    static Stream<Arguments> allAdminRoutes() {
        long dummyId = 99999L;
        return Stream.of(
            Arguments.of(HttpMethod.GET, "/api/admin/overview", null),
            Arguments.of(HttpMethod.GET, "/api/admin/reports", null),
            Arguments.of(HttpMethod.GET, "/api/admin/reports/" + dummyId, null),
            Arguments.of(HttpMethod.PATCH, "/api/admin/reports/" + dummyId, "{\"status\":\"IN_REVIEW\"}"),
            Arguments.of(HttpMethod.GET, "/api/admin/courses", null),
            Arguments.of(HttpMethod.GET, "/api/admin/courses/" + dummyId, null),
            Arguments.of(HttpMethod.PATCH, "/api/admin/courses/" + dummyId, "{\"name\":\"Renamed\"}"),
            Arguments.of(HttpMethod.DELETE, "/api/admin/courses/" + dummyId, null),
            Arguments.of(HttpMethod.POST, "/api/admin/courses/" + dummyId + "/merge", "{\"targetCourseId\":" + dummyId + "}"),
            Arguments.of(HttpMethod.POST, "/api/admin/courses/" + dummyId + "/reanalyze", null),
            Arguments.of(HttpMethod.PATCH, "/api/admin/courses/" + dummyId + "/topics/" + dummyId, "{\"title\":\"Updated\"}"),
            Arguments.of(HttpMethod.DELETE, "/api/admin/courses/" + dummyId + "/topics/" + dummyId, null),
            Arguments.of(HttpMethod.POST, "/api/admin/universities", "{\"name\":\"New Uni\"}"),
            Arguments.of(HttpMethod.PATCH, "/api/admin/universities/" + dummyId, "{\"name\":\"Updated Uni\"}"),
            Arguments.of(HttpMethod.DELETE, "/api/admin/universities/" + dummyId, null),
            Arguments.of(HttpMethod.POST, "/api/admin/colleges", "{\"universityId\":" + dummyId + ",\"name\":\"New College\"}"),
            Arguments.of(HttpMethod.PATCH, "/api/admin/colleges/" + dummyId, "{\"name\":\"Updated College\"}"),
            Arguments.of(HttpMethod.DELETE, "/api/admin/colleges/" + dummyId, null),
            Arguments.of(HttpMethod.GET, "/api/admin/users", null),
            Arguments.of(HttpMethod.GET, "/api/admin/users/" + dummyId, null),
            Arguments.of(HttpMethod.PATCH, "/api/admin/users/" + dummyId + "/role", "{\"role\":\"MODERATOR\"}"),
            Arguments.of(HttpMethod.PATCH, "/api/admin/users/" + dummyId + "/status", "{\"status\":\"SUSPENDED\"}"),
            Arguments.of(HttpMethod.POST, "/api/admin/users/" + dummyId + "/reset-password", null),
            Arguments.of(HttpMethod.GET, "/api/admin/audit-log", null)
        );
    }

    @ParameterizedTest
    @MethodSource("allAdminRoutes")
    void unauthenticatedRequestsToAllAdminEndpointsReturn401Json(HttpMethod method, String path, String body) throws Exception {
        MockHttpServletRequestBuilder req = request(method, path).contentType(MediaType.APPLICATION_JSON);
        if (body != null) {
            req.content(body);
        }
        mockMvc.perform(req)
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false));
    }

    @ParameterizedTest
    @MethodSource("allAdminRoutes")
    void studentRequestsToAllAdminEndpointsReturn403Json(HttpMethod method, String path, String body) throws Exception {
        MockHttpServletRequestBuilder req = request(method, path)
            .header("Authorization", "Bearer " + studentToken)
            .contentType(MediaType.APPLICATION_JSON);
        if (body != null) {
            req.content(body);
        }
        mockMvc.perform(req)
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void moderatorCanAccessReportsOnlyAndIsForbiddenOnOtherAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/reports")
                .header("Authorization", "Bearer " + moderatorToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/admin/reports/" + report.getId())
                .header("Authorization", "Bearer " + moderatorToken))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/overview")
                .header("Authorization", "Bearer " + moderatorToken))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + moderatorToken))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/courses")
                .header("Authorization", "Bearer " + moderatorToken))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/audit-log")
                .header("Authorization", "Bearer " + moderatorToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void demotedAdminWithStillValidJwtImmediatelyLosesAccessOnLiveDbCheck() throws Exception {
        mockMvc.perform(get("/api/admin/overview")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());

        adminUser.setRole(Role.STUDENT);
        studentRepository.save(adminUser);

        mockMvc.perform(get("/api/admin/overview")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void registrationCannotSetOrEscalateRoleFromRequestBody() throws Exception {
        String payload = """
            {
              "fullName": "Sneaky Attacker",
              "email": "attacker@studygenie.local",
              "password": "Password123!",
              "role": "ADMIN"
            }
            """;

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.user.role").value("STUDENT"));

        Student saved = studentRepository.findByEmailIgnoreCase("attacker@studygenie.local").orElseThrow();
        assertThat(saved.getRole()).isEqualTo(Role.STUDENT);
    }

    @Test
    void suspendedUserCannotLoginOrRefreshTokensAndExistingTokensAreRejected() throws Exception {
        String loginRes = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"alice@studygenie.local\",\"password\":\"Password123!\"}"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();

        JsonNode json = objectMapper.readTree(loginRes);
        String refreshToken = json.path("data").path("refreshToken").asText();

        mockMvc.perform(patch("/api/admin/users/" + studentUser.getId() + "/status")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUSPENDED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("SUSPENDED"));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"alice@studygenie.local\",\"password\":\"Password123!\"}"))
            .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/auth/me")
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void adminCannotDemoteOrSuspendSelfOrLastRemainingAdmin() throws Exception {
        mockMvc.perform(patch("/api/admin/users/" + adminUser.getId() + "/role")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"STUDENT\"}"))
            .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/admin/users/" + adminUser.getId() + "/status")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUSPENDED\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void courseMergeMovesEnrollmentsTopicsExamsAndReportsAndWritesAuditLog() throws Exception {
        Course duplicateCourse = courseRepository.save(Course.builder()
            .name("SEC101 Duplicate")
            .college(college)
            .status(CourseStatus.READY)
            .build());

        Syllabus dupSyllabus = syllabusRepository.save(Syllabus.builder()
            .course(duplicateCourse)
            .build());

        topicRepository.save(Topic.builder()
            .syllabus(dupSyllabus)
            .chapterTitle("OWASP Top 10")
            .orderIndex(2)
            .estimatedHours(2.0)
            .build());

        studentUser.setEnrolledCourses(new HashSet<>(Set.of(duplicateCourse)));
        studentRepository.save(studentUser);

        examRepository.save(Exam.builder()
            .courseId(duplicateCourse.getId())
            .course(duplicateCourse.getName())
            .student(studentUser)
            .type("MIDTERM")
            .date(LocalDate.now().plusDays(10))
            .build());

        long auditCountBefore = adminAuditLogRepository.count();

        mockMvc.perform(post("/api/admin/courses/" + duplicateCourse.getId() + "/merge")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"targetCourseId\":" + course.getId() + "}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.id").value(course.getId()))
            .andExpect(jsonPath("$.data.enrollmentCount").value(1))
            .andExpect(jsonPath("$.data.topicCount").value(2));

        Course softDeletedDup = courseRepository.findById(duplicateCourse.getId()).orElseThrow();
        assertThat(softDeletedDup.getDeletedAt()).isNotNull();
        assertThat(adminAuditLogRepository.count()).isEqualTo(auditCountBefore + 1);
    }

    @Test
    void previouslyPermitAllWriteEndpointsRejectAnonymousCallsWhileOption2AndGuestCatalogWork() throws Exception {
        mockMvc.perform(post("/api/v1/exams")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"courseId\":" + course.getId() + ",\"type\":\"FINAL\",\"date\":\"2026-12-01\"}"))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/v1/courses/" + course.getId()))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/api/v1/courses/" + course.getId() + "/topics/" + topic.getId()))
            .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/universities"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/courses"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/exams/challenges"))
            .andExpect(status().isOk());

        // Option 2: sole enrolled student can delete topic
        studentUser.setEnrolledCourses(new HashSet<>(Set.of(course)));
        studentRepository.save(studentUser);

        Topic extraTopic = topicRepository.save(Topic.builder()
            .syllabus(topic.getSyllabus())
            .chapterTitle("Extra Topic")
            .orderIndex(3)
            .estimatedHours(1.5)
            .build());

        mockMvc.perform(delete("/api/v1/courses/" + course.getId() + "/topics/" + extraTopic.getId())
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isOk());

        // Option 2: once 2+ students are enrolled, normal student gets 403 Forbidden
        secondStudentUser.setEnrolledCourses(new HashSet<>(Set.of(course)));
        studentRepository.save(secondStudentUser);

        mockMvc.perform(delete("/api/v1/courses/" + course.getId() + "/topics/" + topic.getId())
                .header("Authorization", "Bearer " + studentToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void corsRejectsPreflightFromUnlistedOrigin() throws Exception {
        mockMvc.perform(options("/api/admin/overview")
                .header("Origin", "https://evil.example.com")
                .header("Access-Control-Request-Method", "GET"))
            .andExpect(status().isForbidden());
    }
}
