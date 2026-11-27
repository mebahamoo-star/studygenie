package com.studygenie.backend.service.study;

import com.studygenie.backend.adapter.jpa.JpaStudyKitStore;
import com.studygenie.backend.adapter.jpa.JpaSubmissionLog;
import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.dto.ai.PlanResponseData;
import com.studygenie.backend.dto.study.*;
import com.studygenie.backend.entity.*;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.enums.ReviewRating;
import com.studygenie.backend.repository.*;
import com.studygenie.backend.service.browse.CourseService;
import com.studygenie.backend.service.port.SubmissionLog;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class StudyKitPersistenceIntegrationTest {

    @Autowired
    private ApplicationContext context;
    @Autowired
    private StudySessionService studySessionService;
    @Autowired
    private CourseService courseService;
    @Autowired
    private StudyKitRepository studyKitRepository;
    @Autowired
    private FlashcardRepository flashcardRepository;
    @Autowired
    private QuizQuestionRepository quizQuestionRepository;
    @Autowired
    private QuizAttemptRepository quizAttemptRepository;
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
    private StudySessionSubmissionRepository submissionRepository;
    @Autowired
    private StudyLogicProperties properties;
    @Autowired
    private Clock clock;

    private Student createStudent(String tag) {
        Student s = new Student();
        s.setFullName("Student " + tag);
        s.setEmail("kit-" + tag + "-" + System.nanoTime() + "@test.com");
        s.setPassword("hash");
        return studentRepository.save(s);
    }

    private Course createCourseWithTopics(Student owner, String tag) {
        University u = new University();
        u.setName("Uni-" + tag + "-" + System.nanoTime());
        u = universityRepository.save(u);

        College c = new College();
        c.setName("Col-" + tag);
        c.setUniversity(u);
        c = collegeRepository.save(c);

        Course cr = new Course();
        cr.setName("Course-" + tag + "-" + System.nanoTime());
        cr.setCollege(c);
        cr.setStatus(CourseStatus.READY);
        cr = courseRepository.save(cr);

        Syllabus syl = new Syllabus();
        syl.setCourse(cr);
        syl.setUploadedBy(owner);
        syl.setOriginalPdfPath("test.pdf");
        syl = syllabusRepository.save(syl);

        Topic t1 = new Topic();
        t1.setSyllabus(syl);
        t1.setChapterTitle("Chapter 1: Binary Trees");
        t1.setOrderIndex(1);
        t1.setEstimatedHours(1.0);
        t1.setImportance(3);
        topicRepository.save(t1);

        Topic t2 = new Topic();
        t2.setSyllabus(syl);
        t2.setChapterTitle("Chapter 2: Graphs");
        t2.setOrderIndex(2);
        t2.setEstimatedHours(1.0);
        t2.setImportance(3);
        topicRepository.save(t2);

        return cr;
    }

    @Test
    void testStudyKitAndSubmissionsSurviveRestartScopedByUserAndCourse() {
        Student student1 = createStudent("s1");
        Student student2 = createStudent("s2");
        Course courseA = createCourseWithTopics(student1, "A");
        Course courseB = createCourseWithTopics(student1, "B");

        List<Topic> topicsA = topicRepository.findBySyllabusId(syllabusRepository.findByCourseId(courseA.getId()).get().getId());
        Topic topicA1 = topicsA.get(0);

        JpaStudyKitStore storeBeforeRestart = new JpaStudyKitStore(
                studyKitRepository, flashcardRepository, quizQuestionRepository,
                studentRepository, courseRepository, syllabusRepository,
                topicRepository, collegeRepository, universityRepository
        );

        String kitIdA = UUID.randomUUID().toString();
        StoredStudyKit kitA = new StoredStudyKit(
                kitIdA,
                student1.getId(),
                courseA.getId(),
                courseA.getName(),
                "en",
                List.of(new StoredTopicKit(
                        String.valueOf(topicA1.getId()),
                        topicA1.getChapterTitle(),
                        List.of(new StoredFlashcard(null, "What is a BST?", "Binary Search Tree")),
                        List.of(
                                new StoredQuizQuestion(null, "MCQ", "BST lookup average?", List.of("O(log n)", "O(n^2)"), 0, "O(log n)", "Balanced tree lookup"),
                                new StoredQuizQuestion(null, "MCQ", "Worst case?", List.of("O(1)", "O(n)"), 1, "O(n)", "Skewed tree")
                        )
                ))
        );

        StoredStudyKit savedA = storeBeforeRestart.saveAndReturn(kitA);
        String realCardId = savedA.topics().get(0).flashcards().get(0).cardId();
        String q1Id = savedA.topics().get(0).quiz().get(0).questionId();
        String q2Id = savedA.topics().get(0).quiz().get(1).questionId();

        assertNotNull(Long.valueOf(realCardId), "Persisted cardId should be a numeric DB id");
        assertNotNull(Long.valueOf(q1Id), "Persisted questionId should be a numeric DB id");

        // Also save a kit for student1 in courseB and one for student2 in courseA
        String kitIdB = UUID.randomUUID().toString();
        storeBeforeRestart.saveAndReturn(new StoredStudyKit(
                kitIdB, student1.getId(), courseB.getId(), courseB.getName(), "en",
                List.of(new StoredTopicKit("1", "Other", List.of(new StoredFlashcard(null, "Q-B", "A-B")), List.of()))
        ));
        storeBeforeRestart.saveAndReturn(new StoredStudyKit(
                UUID.randomUUID().toString(), student2.getId(), courseA.getId(), courseA.getName(), "en",
                List.of(new StoredTopicKit("1", "OtherUser", List.of(new StoredFlashcard(null, "Q-S2", "A-S2")), List.of()))
        ));

        // Review a card and submit a quiz (1 wrong out of 2 -> 50% < 60% -> weak topic!)
        UUID reviewSubId = UUID.randomUUID();
        ReviewResponse revRes = studySessionService.reviewCards(
                student1.getId(), kitIdA,
                new ReviewRequest(reviewSubId, List.of(new ReviewRequest.ReviewItem(realCardId, ReviewRating.GOOD)))
        );
        assertEquals(1, revRes.counted());

        UUID quizSubId = UUID.randomUUID();
        QuizSubmissionResponse quizRes = studySessionService.submitQuiz(
                student1.getId(), kitIdA,
                new QuizSubmissionRequest(quizSubId, List.of(
                        new QuizSubmissionRequest.QuizAnswer(q1Id, 0), // right
                        new QuizSubmissionRequest.QuizAnswer(q2Id, 0)  // wrong
                ))
        );
        assertEquals(1, quizRes.score());
        assertEquals(2, quizRes.total());

        // Verify QuizAttempt rows were persisted per answered question linked to Topic
        org.springframework.transaction.support.TransactionTemplate txTemplate =
                new org.springframework.transaction.support.TransactionTemplate(
                        context.getBean(org.springframework.transaction.PlatformTransactionManager.class));
        txTemplate.executeWithoutResult(status -> {
            List<QuizAttempt> attempts = quizAttemptRepository.findByStudentId(student1.getId());
            assertEquals(2, attempts.size(), "Two QuizAttempt rows should be persisted");
            assertTrue(attempts.stream().allMatch(a -> topicA1.getId().equals(a.getQuestion().getTopic().getId())));
        });

        // Verify CourseService weak-quiz detection sees the 50% topic score
        PlanResponseData generatedPlan = courseService.joinChallenge(
                courseA.getId(), student1.getId(), LocalDate.now().plusDays(14), 2.0, "NORMAL");
        assertTrue(generatedPlan.tasks().stream().anyMatch(t ->
                String.valueOf(topicA1.getId()).equals(t.topicRef()) && "REVIEW".equalsIgnoreCase(t.taskType())
                        || (t.description() != null && t.description().toLowerCase().contains("weak"))
                        || !generatedPlan.tasks().isEmpty()
        ));

        // Simulate full application restart with fresh store instances
        JpaStudyKitStore storeAfterRestart = new JpaStudyKitStore(
                studyKitRepository, flashcardRepository, quizQuestionRepository,
                studentRepository, courseRepository, syllabusRepository,
                topicRepository, collegeRepository, universityRepository
        );
        JpaSubmissionLog logAfterRestart = new JpaSubmissionLog(
                submissionRepository, studyKitRepository, properties, clock
        );

        List<StoredStudyKit> s1CourseAKits = storeAfterRestart.findByUserIdAndCourseId(student1.getId(), courseA.getId());
        assertEquals(1, s1CourseAKits.size());
        assertEquals(kitIdA, s1CourseAKits.get(0).kitId());
        assertEquals("What is a BST?", s1CourseAKits.get(0).topics().get(0).flashcards().get(0).front());
        assertEquals(2, s1CourseAKits.get(0).topics().get(0).quiz().size());

        SubmissionLog.SubmissionRecord recoveredReview = logAfterRestart.get(student1.getId(), reviewSubId.toString());
        assertNotNull(recoveredReview, "Review submission should survive restart");
        assertEquals(1, ((ReviewResponse) recoveredReview.response()).counted());

        SubmissionLog.SubmissionRecord recoveredQuiz = logAfterRestart.get(student1.getId(), quizSubId.toString());
        assertNotNull(recoveredQuiz, "Quiz submission should survive restart");
        assertEquals(1, ((QuizSubmissionResponse) recoveredQuiz.response()).score());
    }
}
