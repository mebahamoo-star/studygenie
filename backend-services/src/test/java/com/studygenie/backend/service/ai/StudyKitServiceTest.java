package com.studygenie.backend.service.ai;

import com.studygenie.backend.adapter.inmemory.InMemoryStudyKitStore;
import com.studygenie.backend.client.AiEngineClient;
import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.dto.ai.*;
import com.studygenie.backend.dto.study.ClientStudyKitResponse;
import com.studygenie.backend.dto.study.StoredQuizQuestion;
import com.studygenie.backend.dto.study.StoredStudyKit;
import com.studygenie.backend.exception.BadRequestException;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.entity.enums.Role;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StudyKitServiceTest {

    private AiEngineClient aiEngineClient;
    private InMemoryStudyKitStore store;
    private StudyKitService service;

    @BeforeEach
    void setUp() {
        aiEngineClient = mock(AiEngineClient.class);
        store = new InMemoryStudyKitStore(new StudyLogicProperties());
        service = new StudyKitService(aiEngineClient, store, null, null);

        AuthenticatedUser principal = new AuthenticatedUser(7L, "user@test.com", Role.STUDENT);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void testGenerateAndSaveShufflesOptionsKeepsAlignmentAndLanguage() {
        List<String> originalOpts = List.of("Binary Search Tree", "Hash Table", "Linked List", "Queue");
        QuizQuestion mcq = new QuizQuestion("MCQ", "Which structure uses left < root < right?", originalOpts, 0, "Binary Search Tree", "BST property");
        Flashcard card = new Flashcard("What is BST?", "Left < Root < Right");
        TopicKit topicKit = new TopicKit("101", List.of(card), List.of(mcq));
        when(aiEngineClient.generateStudyKit(any())).thenReturn(new StudyKitResponseData(List.of(topicKit), List.of(), null));

        GenerateStudyKitRequest req = new GenerateStudyKitRequest(
                "Algorithms",
                "ar",
                List.of(new TopicInput("101", "Trees", List.of("BST"), "Left child < root < right child")),
                5,
                5,
                "MCQ",
                "MEDIUM",
                12L
        );

        ClientStudyKitResponse clientRes = service.generateAndSave(req);
        assertEquals("ar", clientRes.language());
        assertEquals(12L, clientRes.courseId());
        assertEquals(1, clientRes.topics().size());
        assertEquals(4, clientRes.topics().get(0).quiz().get(0).options().size());

        StoredStudyKit stored = store.findById(clientRes.kitId()).orElseThrow();
        StoredQuizQuestion storedQ = stored.topics().get(0).quiz().get(0);
        assertEquals("Binary Search Tree", storedQ.options().get(storedQ.correctOptionIndex()));
    }

    @Test
    void testGenerateAndSaveThrowsWhenAiReturnsEmptyTopics() {
        when(aiEngineClient.generateStudyKit(any())).thenReturn(new StudyKitResponseData(List.of(), List.of(), null));

        GenerateStudyKitRequest req = new GenerateStudyKitRequest(
                "Algorithms",
                "en",
                List.of(new TopicInput("1", "Trees", List.of("BST"), "Tree excerpt")),
                5,
                5
        );

        assertThrows(BadRequestException.class, () -> service.generateAndSave(req));
    }

    @Test
    void generateAndSave_normalizesNullFieldsInRequestAndTopics() {
        TopicInput topicWithNulls = new TopicInput("t-1", "Chapter 1", null, "Excerpt", null, null);
        assertNotNull(topicWithNulls.isHeavilyTested());
        assertFalse(topicWithNulls.isHeavilyTested());
        assertNotNull(topicWithNulls.isHard());
        assertFalse(topicWithNulls.isHard());

        GenerateStudyKitRequest req = new GenerateStudyKitRequest("Test Course", null, List.of(topicWithNulls), 0, 0, null, null, 1L);
        assertEquals("MIXED", req.quizType());
        assertEquals("auto", req.language());
        assertEquals(10, req.flashcardsPerTopic());
        assertEquals(5, req.questionsPerTopic());
        assertFalse(req.topics().get(0).isHeavilyTested());
        assertFalse(req.topics().get(0).isHard());

        when(aiEngineClient.generateStudyKit(any())).thenReturn(new StudyKitResponseData(
                List.of(new TopicKit("t-1", List.of(), List.of())),
                List.of(),
                null
        ));

        ClientStudyKitResponse kit = service.generateAndSave(req);
        assertNotNull(kit);
        assertEquals("Test Course", kit.courseName());
    }
}
