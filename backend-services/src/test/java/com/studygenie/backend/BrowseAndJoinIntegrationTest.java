package com.studygenie.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.dto.browse.CourseCreateRequest;
import com.studygenie.backend.dto.browse.JoinCourseRequest;
import com.studygenie.backend.entity.College;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.Syllabus;
import com.studygenie.backend.entity.Topic;
import com.studygenie.backend.entity.University;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.repository.CollegeRepository;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.repository.StudyPlanRepository;
import com.studygenie.backend.repository.SyllabusRepository;
import com.studygenie.backend.repository.TopicRepository;
import com.studygenie.backend.repository.UniversityRepository;
import com.studygenie.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties={"jwt.secret=this-is-a-very-long-dummy-jwt-secret-for-testing-purposes-12345", "internal.n8n-token=dummy-token", "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1", "spring.datasource.driver-class-name=org.h2.Driver"})
@ActiveProfiles("test") // No "dev" profile here
public class BrowseAndJoinIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

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
    private StudentRepository studentRepository;
    @Autowired
    private StudyPlanRepository studyPlanRepository;
    @Autowired
    private com.studygenie.backend.repository.PlanTaskRepository planTaskRepository;
    @Autowired
    private com.studygenie.backend.repository.ExamRepository examRepository;
    @Autowired
    private com.studygenie.backend.repository.ExamFeedbackRepository examFeedbackRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private String validToken;
    private Student student;
    private Course readyCourse;
    private Course noSyllabusCourse;
    private College college;
    private University university;
    private Syllabus syllabus;
    private Topic topic;

    @BeforeEach
    void setUp() {
        examFeedbackRepository.deleteAll();
        planTaskRepository.deleteAll();
        studyPlanRepository.deleteAll();
        examRepository.deleteAll();
        studentRepository.deleteAll();
        topicRepository.deleteAll();
        syllabusRepository.deleteAll();
        courseRepository.deleteAll();
        collegeRepository.deleteAll();
        universityRepository.deleteAll();

        student = Student.builder().fullName("Test User").email("test@example.com").password("pwd").build();
        student = studentRepository.save(student);

        validToken = "Bearer " + jwtService.generateAccessToken(student.getId(), student.getEmail());

        university = University.builder().name("Test University").build();
        university = universityRepository.save(university);

        college = College.builder().name("Test College").university(university).build();
        college = collegeRepository.save(college);

        readyCourse = Course.builder().name("Ready Course").college(college).status(CourseStatus.READY).build();
        readyCourse = courseRepository.save(readyCourse);

        syllabus = Syllabus.builder().course(readyCourse).build();
        syllabus = syllabusRepository.save(syllabus);

        topic = Topic.builder().syllabus(syllabus).chapterTitle("Chapter 1").orderIndex(1).estimatedHours(2.0).build();
        topic = topicRepository.save(topic);

        noSyllabusCourse = Course.builder().name("No Syllabus Course").college(college).status(CourseStatus.NO_SYLLABUS).build();
        noSyllabusCourse = courseRepository.save(noSyllabusCourse);
    }

    @Test
    void testGetUniversities() throws Exception {
        mockMvc.perform(get("/api/v1/universities").header("Authorization", validToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("Test University"));
    }

    @Test
    void testGetUniversity_NotFound() throws Exception {
        mockMvc.perform(get("/api/v1/universities/999").header("Authorization", validToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void testGetColleges() throws Exception {
        mockMvc.perform(get("/api/v1/universities/" + university.getId() + "/colleges").header("Authorization", validToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].name").value("Test College"));
    }

    @Test
    void testGetCourses() throws Exception {
        mockMvc.perform(get("/api/v1/colleges/" + college.getId() + "/courses").header("Authorization", validToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));
    }

    @Test
    void testCreateCourse_Success() throws Exception {
        CourseCreateRequest req = new CourseCreateRequest("New Course");
        mockMvc.perform(post("/api/v1/colleges/" + college.getId() + "/courses")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("New Course"))
                .andExpect(jsonPath("$.data.status").value("NO_SYLLABUS"));
    }

    @Test
    void testCreateCourse_AlreadyExistsReturnsExisting() throws Exception {
        CourseCreateRequest req = new CourseCreateRequest("Ready Course"); // Same name
        mockMvc.perform(post("/api/v1/colleges/" + college.getId() + "/courses")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(readyCourse.getId())); // Should return existing
    }

    @Test
    void testGetCourseTopics_Ready() throws Exception {
        mockMvc.perform(get("/api/v1/courses/" + readyCourse.getId() + "/topics").header("Authorization", validToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].chapterTitle").value("Chapter 1"));
    }

    @Test
    void testGetCourseTopics_NoSyllabus() throws Exception {
        mockMvc.perform(get("/api/v1/courses/" + noSyllabusCourse.getId() + "/topics").header("Authorization", validToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("This course has no syllabus yet."));
    }

    @Test
    void testJoinCourse_Success() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(30), 2.0, "NORMAL");

        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk()); // Returns PlanResponseData

        // Verify StudyPlan was created
        assert studyPlanRepository.findByStudentId(student.getId()).size() == 1;
        com.studygenie.backend.entity.StudyPlan sp = studyPlanRepository.findByStudentId(student.getId()).get(0);
        assert planTaskRepository.findByStudyPlanId(sp.getId()).size() == 1;
    }

    @Test
    void testJoinCourse_NoSyllabus_Returns409() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(30), 2.0, "NORMAL");

        mockMvc.perform(post("/api/v1/courses/" + noSyllabusCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("NO_SYLLABUS"));
    }

    @Test
    void testJoinCourse_AlreadyJoined_Returns409() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(30), 2.0, "NORMAL");

        // First join
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        // Second join
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("You have already joined this course and generated a plan."));
    }

    @Test
    void testJoinCourse_Unauthenticated() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(30), 2.0, "NORMAL");

        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetCoursePlan_Unauthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/courses/" + readyCourse.getId() + "/plan")).andExpect(status().isUnauthorized());
    }

    @Test
    void testGetCoursePlan_NotFound() throws Exception {
        mockMvc.perform(get("/api/v1/courses/" + readyCourse.getId() + "/plan").header("Authorization", validToken))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.errorCode").value("NOT_JOINED"));
    }

    @Test
    void testGetCoursePlan_Success() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(30), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join").header("Authorization", validToken).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(req))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/courses/" + readyCourse.getId() + "/plan").header("Authorization", validToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tasks").isArray())
                .andExpect(jsonPath("$.data.tasks[0].task_type").value("LEARN"))
                .andExpect(jsonPath("$.data.tasks[0].minutes").value(120))
                .andExpect(jsonPath("$.data.summary.planned_minutes").value(120))
                .andExpect(jsonPath("$.data.summary.study_days").value(1));
    }

    @Test
    void testJoinCourse_PastOrTodayExamDate_Returns400() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now(), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testJoinCourse_InvalidRestWeekday_Returns400() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(14), 2.0, "NORMAL", null, java.util.List.of(7));
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testTaskCompletionToggle_AntiDoubleXp_AndOwnershipCheck() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(14), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        com.studygenie.backend.entity.StudyPlan sp = studyPlanRepository.findByStudentId(student.getId()).get(0);
        Long taskId = planTaskRepository.findByStudyPlanId(sp.getId()).get(0).getId();

        // First completion grants XP
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/v1/courses/" + readyCourse.getId() + "/plan/tasks/" + taskId)
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isCompleted\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("XP_GRANTED"))
                .andExpect(jsonPath("$.data.is_completed").value(true))
                .andExpect(jsonPath("$.data.xp_awarded").value(true));

        // Uncheck then re-check must NOT grant XP twice
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/v1/courses/" + readyCourse.getId() + "/plan/tasks/" + taskId)
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isCompleted\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.is_completed").value(false));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/v1/courses/" + readyCourse.getId() + "/plan/tasks/" + taskId)
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isCompleted\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Task updated"))
                .andExpect(jsonPath("$.data.is_completed").value(true));

        // Another student cannot toggle someone else's task
        Student other = Student.builder()
                .email("other@test.com")
                .password("pwd")
                .fullName("Other Student")
                .build();
        other = studentRepository.save(other);
        String otherToken = "Bearer " + jwtService.generateAccessToken(other.getId(), other.getEmail());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/v1/courses/" + readyCourse.getId() + "/plan/tasks/" + taskId)
                .header("Authorization", otherToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isCompleted\":false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testRegeneratePlan_PreservesCompletedTasks() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(14), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        com.studygenie.backend.entity.StudyPlan sp = studyPlanRepository.findByStudentId(student.getId()).get(0);
        Long taskId = planTaskRepository.findByStudyPlanId(sp.getId()).get(0).getId();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/v1/courses/" + readyCourse.getId() + "/plan/tasks/" + taskId)
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isCompleted\":true}"))
                .andExpect(status().isOk());

        // Regenerate: completed task (full 2.0h) must be preserved
        JoinCourseRequest regenReq = new JoinCourseRequest(LocalDate.now().plusDays(20), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/plan")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(regenReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tasks[0].id").value(taskId))
                .andExpect(jsonPath("$.data.tasks[0].is_completed").value(true));
    }

    @Test
    void testRegeneratePlan_KeepsOrReschedulesIncompleteReviewsForCompletedStudyTopics() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(14), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        com.studygenie.backend.entity.StudyPlan sp = studyPlanRepository.findByStudentId(student.getId()).get(0);
        com.studygenie.backend.entity.PlanTask studyTask = planTaskRepository.findByStudyPlanId(sp.getId()).get(0);
        studyTask.setIsCompleted(true);
        studyTask.setCompletedAt(java.time.LocalDateTime.now());
        planTaskRepository.save(studyTask);

        com.studygenie.backend.entity.PlanTask pastReview = com.studygenie.backend.entity.PlanTask.builder()
                .studyPlan(sp)
                .topic(topic)
                .scheduledDate(LocalDate.now().minusDays(2))
                .taskType("REVIEW")
                .minutes(15)
                .description("Active Recall: Chapter 1")
                .isCompleted(false)
                .xpAwarded(false)
                .build();
        pastReview = planTaskRepository.save(pastReview);

        JoinCourseRequest regenReq = new JoinCourseRequest(LocalDate.now().plusDays(20), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/plan")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(regenReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tasks", hasSize(2)))
                .andExpect(jsonPath("$.data.tasks[?(@.task_type == 'REVIEW')]").exists());

        com.studygenie.backend.entity.PlanTask keptReview = planTaskRepository.findById(pastReview.getId()).orElseThrow();
        assert !keptReview.getScheduledDate().isBefore(LocalDate.now());
    }

    @Test
    void testRegeneratePlan_SubtractsMinutesCompletedTodayFromTodayCapacity() throws Exception {
        Topic topic2 = Topic.builder().syllabus(syllabus).chapterTitle("Chapter 2").orderIndex(2).estimatedHours(2.0).build();
        topicRepository.save(topic2);

        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(14), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        com.studygenie.backend.entity.StudyPlan sp = studyPlanRepository.findByStudentId(student.getId()).get(0);
        com.studygenie.backend.entity.PlanTask task1 = planTaskRepository.findByStudyPlanId(sp.getId()).get(0);
        task1.setMinutes(60);
        task1.setScheduledDate(LocalDate.now());
        task1.setIsCompleted(true);
        task1.setCompletedAt(java.time.LocalDateTime.now());
        planTaskRepository.save(task1);

        JoinCourseRequest regenReq = new JoinCourseRequest(LocalDate.now().plusDays(14), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/plan")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(regenReq)))
                .andExpect(status().isOk());

        int incompleteTodayMins = planTaskRepository.findByStudyPlanId(sp.getId()).stream()
                .filter(pt -> !Boolean.TRUE.equals(pt.getIsCompleted()) && LocalDate.now().equals(pt.getScheduledDate()))
                .mapToInt(pt -> pt.getMinutes() != null ? pt.getMinutes() : 0)
                .sum();
        assert incompleteTodayMins <= 60;
    }

    @Test
    void testRegeneratePlan_WeekdayHoursCanBeClearedAndPreloadedInGetPlan() throws Exception {
        String joinBody = """
                {
                  "examDate": "%s",
                  "dailyHours": 2.0,
                  "mode": "NORMAL",
                  "weekday_hours": {"0": 3.0, "1": 4.0}
                }
                """.formatted(LocalDate.now().plusDays(14));

        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(joinBody))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/courses/" + readyCourse.getId() + "/plan")
                .header("Authorization", validToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.weekday_hours['0']").value(3.0))
                .andExpect(jsonPath("$.data.weekday_hours['1']").value(4.0));

        String clearBody = """
                {
                  "examDate": "%s",
                  "dailyHours": 2.0,
                  "mode": "NORMAL",
                  "weekday_hours": {}
                }
                """.formatted(LocalDate.now().plusDays(14));

        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/plan")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(clearBody))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/courses/" + readyCourse.getId() + "/plan")
                .header("Authorization", validToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.weekday_hours").doesNotExist());
    }

    @Test
    void testSubmitFeedback_ResolvesCourseIdAndRejectsUnresolvable() throws Exception {
        mockMvc.perform(post("/api/enrollments/enroll_unknown/feedback")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"difficulty\":\"HARD\",\"hardTopicIds\":[],\"testedTopicIds\":[]}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/enrollments/enroll_valid/feedback")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"courseId\":" + readyCourse.getId() + ",\"difficulty\":\"HARD\",\"hardTopicIds\":[],\"testedTopicIds\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.success").value(true));
    }

    @Test
    void testXpAwarding_ServerSidePointsAndSurvivesUncheckedRegeneration() throws Exception {
        int initialXp = studentRepository.findById(student.getId()).orElseThrow().getGeniePoints();

        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(14), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        com.studygenie.backend.entity.StudyPlan sp = studyPlanRepository.findByStudentId(student.getId()).get(0);
        Long taskId = planTaskRepository.findByStudyPlanId(sp.getId()).get(0).getId();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/v1/courses/" + readyCourse.getId() + "/plan/tasks/" + taskId)
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isCompleted\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("XP_GRANTED"));

        assert studentRepository.findById(student.getId()).orElseThrow().getGeniePoints() == initialXp + 15;

        // Uncheck the task, then regenerate the plan
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/v1/courses/" + readyCourse.getId() + "/plan/tasks/" + taskId)
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isCompleted\":false}"))
                .andExpect(status().isOk());

        JoinCourseRequest regenReq = new JoinCourseRequest(LocalDate.now().plusDays(20), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/plan")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(regenReq)))
                .andExpect(status().isOk());

        Long regeneratedTaskId = planTaskRepository.findByStudyPlanId(sp.getId()).get(0).getId();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(
                        "/api/v1/courses/" + readyCourse.getId() + "/plan/tasks/" + regeneratedTaskId)
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"isCompleted\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Task updated"));

        assert studentRepository.findById(student.getId()).orElseThrow().getGeniePoints() == initialXp + 15;
    }

    @Test
    void testReschedulePlan_PastOrTodayExamDate_Returns400() throws Exception {
        JoinCourseRequest req = new JoinCourseRequest(LocalDate.now().plusDays(14), 2.0, "NORMAL");
        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/join")
                .header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        com.studygenie.backend.entity.StudyPlan sp = studyPlanRepository.findByStudentId(student.getId()).get(0);
        sp.setExamDate(LocalDate.now());
        studyPlanRepository.save(sp);

        mockMvc.perform(post("/api/v1/courses/" + readyCourse.getId() + "/plan/reschedule")
                .header("Authorization", validToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testOldMockPaths_Return404() throws Exception {
        mockMvc.perform(post("/api/plans/generate").header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/study-kits/generate").header("Authorization", validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/courses/101/topics").header("Authorization", validToken))
                .andExpect(status().isNotFound());
    }
    
    @Test
    void testDevGamificationTrigger_Is404InTestProfile() throws Exception {
        mockMvc.perform(post("/api/v1/gamification/test-trigger?actionType=SYLLABUS_UPLOADED")
                .header("Authorization", validToken))
                .andExpect(status().isNotFound());
    }
}















