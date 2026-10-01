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
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private String validToken;
    private Student student;
    private Course readyCourse;
    private Course noSyllabusCourse;
    private College college;
    private University university;

    @BeforeEach
    void setUp() {
        planTaskRepository.deleteAll();
        studyPlanRepository.deleteAll();
        topicRepository.deleteAll();
        syllabusRepository.deleteAll();
        courseRepository.deleteAll();
        collegeRepository.deleteAll();
        universityRepository.deleteAll();
        studentRepository.deleteAll();

        student = Student.builder().fullName("Test User").email("test@example.com").password("pwd").build();
        student = studentRepository.save(student);

        validToken = "Bearer " + jwtService.generateAccessToken(student.getId(), student.getEmail());

        university = University.builder().name("Test University").build();
        university = universityRepository.save(university);

        college = College.builder().name("Test College").university(university).build();
        college = collegeRepository.save(college);

        readyCourse = Course.builder().name("Ready Course").college(college).status(CourseStatus.READY).build();
        readyCourse = courseRepository.save(readyCourse);

        Syllabus syllabus = Syllabus.builder().course(readyCourse).build();
        syllabus = syllabusRepository.save(syllabus);

        Topic topic = Topic.builder().syllabus(syllabus).chapterTitle("Chapter 1").orderIndex(1).estimatedHours(2.0).build();
        topicRepository.save(topic);

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
        mockMvc.perform(get("/api/v1/courses/" + readyCourse.getId() + "/plan").header("Authorization", validToken)).andExpect(status().isOk()).andExpect(jsonPath("$.data.tasks").isArray()).andExpect(jsonPath("$.data.summary").exists());
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















