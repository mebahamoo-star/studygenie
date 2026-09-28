package com.studygenie.backend.service.study;

import com.studygenie.backend.dto.study.*;
import com.studygenie.backend.enums.ReviewRating;
import com.studygenie.backend.service.port.GamificationStore;
import com.studygenie.backend.service.port.StudyKitStore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("dev")
public class StudySessionIntegrationTest {

    @Autowired
    private StudySessionService studySessionService;
    
    @Autowired
    private StudyKitStore kitStore;
    
    @Autowired
    private GamificationStore gamificationStore;

    @Test
    void testStudyLogicIncreasesGamificationXp() {
        // Create kit for user 99
        Long userId = 99L;
        String kitId = UUID.randomUUID().toString();
        StoredStudyKit kit = new StoredStudyKit(kitId, userId, List.of(
            new StoredTopicKit("t1", 
                List.of(new StoredFlashcard("c1", "Q", "A")), 
                List.of(new StoredQuizQuestion("q1", "MCQ", "Q1", List.of("A", "B"), 0, ""))
            )
        ));
        kitStore.save(kit);

        // Record base XP
        int initialXp = gamificationStore.getProfile(userId).currentXp();

        // 1. Review Flashcard
        ReviewRequest reviewReq = new ReviewRequest(UUID.randomUUID(), List.of(
            new ReviewRequest.ReviewItem("c1", ReviewRating.GOOD)
        ));
        studySessionService.reviewCards(userId, kitId, reviewReq);

        // Verify XP increased (1 GOOD card)
        int xpAfterReview = gamificationStore.getProfile(userId).currentXp();
        assertTrue(xpAfterReview > initialXp, "XP should increase after flashcard review");

        // 2. Submit Quiz
        QuizSubmissionRequest quizReq = new QuizSubmissionRequest(UUID.randomUUID(), List.of(
            new QuizSubmissionRequest.QuizAnswer("q1", 0)
        ));
        studySessionService.submitQuiz(userId, kitId, quizReq);

        // Verify XP increased again (passed quiz)
        int xpAfterQuiz = gamificationStore.getProfile(userId).currentXp();
        assertTrue(xpAfterQuiz > xpAfterReview, "XP should increase after passing quiz");
    }
}
