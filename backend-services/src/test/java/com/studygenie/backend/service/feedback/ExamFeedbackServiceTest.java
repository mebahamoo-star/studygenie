package com.studygenie.backend.service.feedback;

import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.GenerateStudyKitRequest;
import com.studygenie.backend.dto.ai.TopicInput;
import com.studygenie.backend.dto.ai.TopicPlanInput;
import com.studygenie.backend.dto.feedback.CourseFeedbackSummary;
import com.studygenie.backend.dto.feedback.ExamFeedbackPayload;
import com.studygenie.backend.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ExamFeedbackServiceTest {

    private ExamFeedbackService service;

    @BeforeEach
    void setUp() {
        service = new ExamFeedbackService();
    }

    @Test
    void testSaveFeedbackAndSummary() {
        ExamFeedbackPayload payload = ExamFeedbackPayload.builder()
                .difficulty("HARD")
                .testedTopicIds(List.of(101L, 102L))
                .hardTopicIds(List.of(102L))
                .build();

        service.registerEnrollmentCourse("enroll_cs305", "Database Systems");
        service.saveFeedback("enroll_cs305", 1L, payload);

        CourseFeedbackSummary summary = service.getFeedbackSummary("Database Systems");
        assertThat(summary.getTotalSubmissions()).isEqualTo(1);
        assertThat(summary.getDominantDifficulty()).isEqualTo("HARD");
        assertThat(summary.getHeavilyTestedTopicIds()).containsExactlyInAnyOrder(101L, 102L);
        assertThat(summary.getHardTopicIds()).containsExactly(102L);
    }

    @Test
    void testEnrichPlanRequest() {
        ExamFeedbackPayload payload = ExamFeedbackPayload.builder()
                .difficulty("HARD")
                .testedTopicIds(List.of(1L))
                .hardTopicIds(List.of(2L))
                .build();

        service.registerEnrollmentCourse("enroll_cs305", "CS 305");
        service.saveFeedback("enroll_cs305", 1L, payload);

        GeneratePlanRequest req = GeneratePlanRequest.builder()
                .startDate(LocalDate.now())
                .examDate(LocalDate.now().plusWeeks(2))
                .topics(List.of(
                        TopicPlanInput.builder().ref("1").chapterTitle("Intro").orderIndex(1).build(),
                        TopicPlanInput.builder().ref("2").chapterTitle("Transactions").orderIndex(2).build()
                ))
                .build();

        GeneratePlanRequest enriched = service.enrichPlanRequest(req, "CS 305");
        assertThat(enriched.getCourseDifficulty()).isEqualTo("HARD");
        assertThat(enriched.topics().get(0).isHeavilyTested()).isTrue();
        assertThat(enriched.topics().get(1).isHard()).isTrue();
    }

    @Test
    void testEnrichStudyKitRequest() {
        ExamFeedbackPayload payload = ExamFeedbackPayload.builder()
                .difficulty("MEDIUM")
                .testedTopicIds(List.of(1L))
                .build();

        service.registerEnrollmentCourse("enroll_algo", "Algorithms");
        service.saveFeedback("enroll_algo", 1L, payload);

        GenerateStudyKitRequest req = new GenerateStudyKitRequest(
                "Algorithms",
                "en",
                List.of(new TopicInput("1", "Dynamic Programming", List.of("Memoization"), "Excerpt")),
                5,
                3
        );

        GenerateStudyKitRequest enriched = service.enrichStudyKitRequest(req);
        assertThat(enriched.courseDifficulty()).isEqualTo("MEDIUM");
        assertThat(enriched.topics().get(0).isHeavilyTested()).isTrue();
    }

    @Test
    void testFeedbackNotLeakedAcrossCoursesWhenOnlyOneEntryExists() {
        ExamFeedbackPayload payload = ExamFeedbackPayload.builder()
                .courseId(10L)
                .courseName("Database Systems")
                .difficulty("HARD")
                .testedTopicIds(List.of(1L))
                .hardTopicIds(List.of(2L))
                .build();

        service.registerEnrollmentCourse("enroll_db", 10L, "Database Systems");
        service.saveFeedback("enroll_db", 1L, payload);

        GeneratePlanRequest otherCourseReq = GeneratePlanRequest.builder()
                .courseId(20L)
                .startDate(LocalDate.now())
                .examDate(LocalDate.now().plusWeeks(2))
                .topics(List.of(
                        TopicPlanInput.builder().ref("1").chapterTitle("Intro").orderIndex(1).build(),
                        TopicPlanInput.builder().ref("2").chapterTitle("Kinematics").orderIndex(2).build()
                ))
                .build();

        GeneratePlanRequest enriched = service.enrichPlanRequest(otherCourseReq, 20L, "Physics 101");
        assertThat(enriched.getCourseDifficulty()).isNull();
        assertThat(enriched.topics().get(0).isHeavilyTested()).isFalse();
        assertThat(enriched.topics().get(1).isHard()).isFalse();
    }

    @Test
    void testEnrichPlanRequest_PreservesWeakQuizAndQuizScore() {
        ExamFeedbackPayload payload = ExamFeedbackPayload.builder()
                .courseId(10L)
                .courseName("CS 305")
                .difficulty("HARD")
                .testedTopicIds(List.of(1L))
                .build();

        service.registerEnrollmentCourse("enroll_cs305", 10L, "CS 305");
        service.saveFeedback("enroll_cs305", 1L, payload);

        GeneratePlanRequest req = GeneratePlanRequest.builder()
                .courseId(10L)
                .startDate(LocalDate.now())
                .examDate(LocalDate.now().plusWeeks(2))
                .topics(List.of(
                        TopicPlanInput.builder()
                                .ref("1")
                                .chapterTitle("Intro")
                                .orderIndex(1)
                                .isWeakQuiz(true)
                                .quizScore(42.5)
                                .build()
                ))
                .build();

        GeneratePlanRequest enriched = service.enrichPlanRequest(req, 10L, "CS 305");
        assertThat(enriched.topics().get(0).getIsWeakQuiz()).isTrue();
        assertThat(enriched.topics().get(0).getQuizScore()).isEqualTo(42.5);
    }

    @Test
    void testSaveFeedback_RejectsUnresolvableCourse() {
        ExamFeedbackPayload payload = ExamFeedbackPayload.builder()
                .difficulty("HARD")
                .build();

        assertThatThrownBy(() -> service.saveFeedback("unknown_id", 1L, payload))
                .isInstanceOf(BadRequestException.class);
    }
}
