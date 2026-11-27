package com.studygenie.backend.service.ai;

import com.studygenie.backend.client.AiEngineClient;
import com.studygenie.backend.dto.ai.*;
import com.studygenie.backend.dto.study.*;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.exception.BadRequestException;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.security.AuthenticatedUser;
import com.studygenie.backend.service.port.StudyKitStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class StudyKitService {
    private final AiEngineClient aiEngineClient;
    private final StudyKitStore store;
    private final com.studygenie.backend.service.feedback.ExamFeedbackService feedbackService;
    private final CourseRepository courseRepository;

    public StudyKitService(AiEngineClient aiEngineClient, StudyKitStore store, com.studygenie.backend.service.feedback.ExamFeedbackService feedbackService) {
        this(aiEngineClient, store, feedbackService, null);
    }

    @Autowired
    public StudyKitService(
            AiEngineClient aiEngineClient,
            StudyKitStore store,
            com.studygenie.backend.service.feedback.ExamFeedbackService feedbackService,
            @Autowired(required = false) CourseRepository courseRepository) {
        this.aiEngineClient = aiEngineClient;
        this.store = store;
        this.feedbackService = feedbackService;
        this.courseRepository = courseRepository;
    }

    public ClientStudyKitResponse generateAndSave(GenerateStudyKitRequest request) {
        Long resolvedCourseId = request.courseId();
        if (resolvedCourseId == null && courseRepository != null && request.courseName() != null && !request.courseName().isBlank()) {
            resolvedCourseId = courseRepository.findFirstByNameIgnoreCase(request.courseName().trim())
                    .map(Course::getId)
                    .orElse(null);
        }

        GenerateStudyKitRequest normalizedRequest = new GenerateStudyKitRequest(
                request.courseName(),
                request.language(),
                request.topics(),
                request.flashcardsPerTopic(),
                request.questionsPerTopic(),
                request.quizType(),
                request.courseDifficulty(),
                resolvedCourseId
        );

        GenerateStudyKitRequest enriched = feedbackService != null ? feedbackService.enrichStudyKitRequest(normalizedRequest) : normalizedRequest;
        StudyKitResponseData data = aiEngineClient.generateStudyKit(enriched);
        if (data == null || data.topics() == null || data.topics().isEmpty()) {
            throw new BadRequestException("Could not generate study kit from syllabus content.");
        }

        Long userId = getUserId();
        String kitId = UUID.randomUUID().toString();
        Random shuffleRand = new Random();

        Map<String, String> chapterTitleByRef = new HashMap<>();
        if (request.topics() != null) {
            for (TopicInput ti : request.topics()) {
                if (ti.ref() != null && ti.chapterTitle() != null) {
                    chapterTitleByRef.put(ti.ref(), ti.chapterTitle());
                }
            }
        }

        int targetLimit = request.flashcardsPerTopic() > 0 ? request.flashcardsPerTopic() : 10;
        List<StoredTopicKit> storedTopics = data.topics().stream().map(topic -> {
            List<StoredFlashcard> storedCards = topic.flashcards() != null
                    ? topic.flashcards().stream()
                            .limit(targetLimit)
                            .map(fc -> new StoredFlashcard(null, fc.front(), fc.back()))
                            .collect(Collectors.toList())
                    : List.of();

            List<StoredQuizQuestion> storedQuizzes = topic.quiz() != null
                    ? topic.quiz().stream()
                            .map(q -> normalizeAndShuffleQuestion(q, shuffleRand))
                            .collect(Collectors.toList())
                    : List.of();

            return new StoredTopicKit(topic.ref(), chapterTitleByRef.get(topic.ref()), storedCards, storedQuizzes);
        }).collect(Collectors.toList());

        String lang = (request.language() != null && !request.language().isBlank()) ? request.language() : "en";
        StoredStudyKit storedKit = new StoredStudyKit(kitId, userId, resolvedCourseId, request.courseName(), lang, storedTopics);
        StoredStudyKit persistedKit = store.saveAndReturn(storedKit);

        return ClientStudyKitResponse.fromStored(persistedKit);
    }

    public List<ClientStudyKitResponse> getKitsForUser(Long courseId) {
        Long userId = getUserId();
        List<StoredStudyKit> kits = (courseId != null)
                ? store.findByUserIdAndCourseId(userId, courseId)
                : store.findByUserId(userId);
        return kits.stream().map(ClientStudyKitResponse::fromStored).collect(Collectors.toList());
    }

    public ClientStudyKitResponse getKitById(String kitId) {
        Long userId = getUserId();
        StoredStudyKit kit = store.findById(kitId)
                .filter(k -> userId.equals(k.ownerId()))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));
        return ClientStudyKitResponse.fromStored(kit);
    }

    private StoredQuizQuestion normalizeAndShuffleQuestion(QuizQuestion q, Random rand) {
        String type = q.type() != null ? q.type().trim().toUpperCase(Locale.ROOT) : "MCQ";
        List<String> opts = q.options() != null ? new ArrayList<>(q.options()) : new ArrayList<>();
        int correctIdx = q.correctOptionIndex();
        String correctText = q.correctAnswerText();
        if ("MCQ".equals(type) && opts.size() >= 2 && correctIdx >= 0 && correctIdx < opts.size()) {
            String targetOption = opts.get(correctIdx);
            Collections.shuffle(opts, rand);
            correctIdx = opts.indexOf(targetOption);
            if (correctText == null || correctText.isBlank()) {
                correctText = targetOption;
            }
        }
        return new StoredQuizQuestion(null, type, q.question(), opts, correctIdx, correctText, q.explanation());
    }

    private Long getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            if (auth.getPrincipal() instanceof AuthenticatedUser user) {
                return user.id();
            }
            try { return Long.valueOf(auth.getName()); } catch (NumberFormatException ignored) {}
        }
        throw new IllegalStateException("User not authenticated");
    }
}
