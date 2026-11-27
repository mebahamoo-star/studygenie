package com.studygenie.backend.service.study;

import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.dto.study.*;
import com.studygenie.backend.entity.QuizAttempt;
import com.studygenie.backend.entity.QuizQuestion;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.enums.ActionType;
import com.studygenie.backend.event.UserActionCompletedEvent;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.repository.QuizAttemptRepository;
import com.studygenie.backend.repository.QuizQuestionRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.service.port.CardScheduleStore;
import com.studygenie.backend.service.port.StudyKitStore;
import com.studygenie.backend.service.port.SubmissionLog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
public class StudySessionService {

    private final StudyKitStore kitStore;
    private final CardScheduleStore scheduleStore;
    private final SubmissionLog submissionLog;
    private final StudyLogicProperties properties;
    private final Clock clock;
    private final ApplicationEventPublisher publisher;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final StudentRepository studentRepository;

    public static final ThreadLocal<com.studygenie.backend.enums.ReviewRating> currentReviewRating = new ThreadLocal<>();

    public StudySessionService(StudyKitStore kitStore, CardScheduleStore scheduleStore, SubmissionLog submissionLog,
                               StudyLogicProperties properties, Clock clock, ApplicationEventPublisher publisher) {
        this(kitStore, scheduleStore, submissionLog, properties, clock, publisher, null, null, null);
    }

    @Autowired
    public StudySessionService(StudyKitStore kitStore, CardScheduleStore scheduleStore, SubmissionLog submissionLog,
                               StudyLogicProperties properties, Clock clock, ApplicationEventPublisher publisher,
                               @Autowired(required = false) QuizAttemptRepository quizAttemptRepository,
                               @Autowired(required = false) QuizQuestionRepository quizQuestionRepository,
                               @Autowired(required = false) StudentRepository studentRepository) {
        this.kitStore = kitStore;
        this.scheduleStore = scheduleStore;
        this.submissionLog = submissionLog;
        this.properties = properties;
        this.clock = clock;
        this.publisher = publisher;
        this.quizAttemptRepository = quizAttemptRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.studentRepository = studentRepository;
    }

    public ReviewResponse reviewCards(Long userId, String kitId, ReviewRequest request) {
        int payloadHash = request.hashCode();
        String submissionIdStr = request.submissionId().toString();

        SubmissionLog.SubmissionRecord record = submissionLog.get(userId, submissionIdStr);
        if (record != null) {
            if (record.payloadHash() != payloadHash) {
                throw new IllegalStateException("CONFLICT");
            }
            return (ReviewResponse) record.response();
        }

        StoredStudyKit kit = kitStore.findById(kitId)
                .filter(k -> k.ownerId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));

        Set<String> validCardIds = new HashSet<>();
        for (StoredTopicKit t : kit.topics()) {
            for (StoredFlashcard f : t.flashcards()) {
                validCardIds.add(f.cardId());
            }
        }

        Set<String> seenCards = new HashSet<>();
        LocalDate today = LocalDate.now(clock);

        int reviewed = 0;
        int counted = 0;
        int again = 0, hard = 0, good = 0, easy = 0;
        List<CardSchedule> updatedSchedules = new ArrayList<>();

        for (ReviewRequest.ReviewItem item : request.items()) {
            if (!validCardIds.contains(item.cardId())) {
                throw new IllegalArgumentException("Card does not belong to this kit: " + item.cardId());
            }
            if (!seenCards.add(item.cardId())) {
                throw new IllegalArgumentException("Duplicate cardId in review request: " + item.cardId());
            }

            CardScheduleStore.CardScheduleUpdateResult result;
            currentReviewRating.set(item.rating());
            try {
                result = scheduleStore.update(userId, kitId, item.cardId(), base -> {
                    CardSchedule scheduleToUse = base != null ? base : CardSchedule.newCard(item.cardId(), properties.getInitialEaseFactor(), today);
                    
                    if (!scheduleToUse.isDue(today)) {
                        return new CardScheduleStore.CardScheduleUpdateResult(scheduleToUse, false);
                    }
                    
                    CardSchedule updated = SpacedRepetitionScheduler.review(
                            scheduleToUse, item.rating(), today, properties.getMinEaseFactor(), properties.getMaxIntervalDays());
                    return new CardScheduleStore.CardScheduleUpdateResult(updated, true);
                });
            } finally {
                currentReviewRating.remove();
            }

            reviewed++;
            if (result.counted()) {
                counted++;
                switch (item.rating()) {
                    case AGAIN -> again++;
                    case HARD -> hard++;
                    case GOOD -> good++;
                    case EASY -> easy++;
                }
            }
            updatedSchedules.add(result.schedule());
        }

        ReviewResponse response = new ReviewResponse(reviewed, counted, again, hard, good, easy, updatedSchedules);
        
        submissionLog.putIfAbsent(userId, submissionIdStr, payloadHash, response, Instant.now(clock)); // Complete the deferred storage

        if (counted > 0) {
            int baseScore = good + easy;
            String eventId = userId + ":REVIEW:" + submissionIdStr;
            publisher.publishEvent(new UserActionCompletedEvent(eventId, userId, null, ActionType.FLASHCARDS_REVIEWED, baseScore));
        }

        return response;
    }

    public QuizSubmissionResponse submitQuiz(Long userId, String kitId, QuizSubmissionRequest request) {
        int payloadHash = request.hashCode();
        String submissionIdStr = request.submissionId().toString();

        SubmissionLog.SubmissionRecord record = submissionLog.get(userId, submissionIdStr);
        if (record != null) {
            if (record.payloadHash() != payloadHash) {
                throw new IllegalStateException("CONFLICT");
            }
            return (QuizSubmissionResponse) record.response();
        }

        StoredStudyKit kit = kitStore.findById(kitId)
                .filter(k -> k.ownerId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));

        Map<String, StoredQuizQuestion> validQuestions = new HashMap<>();
        for (StoredTopicKit t : kit.topics()) {
            for (StoredQuizQuestion q : t.quiz()) {
                validQuestions.put(q.questionId(), q);
            }
        }

        Set<String> answeredIds = new HashSet<>();
        int correctCount = 0;
        List<QuizSubmissionResponse.QuestionResult> results = new ArrayList<>();

        for (QuizSubmissionRequest.QuizAnswer answer : request.answers()) {
            if (!answeredIds.add(answer.questionId())) {
                throw new IllegalArgumentException("Duplicate answer for question: " + answer.questionId());
            }
            StoredQuizQuestion q = validQuestions.get(answer.questionId());
            if (q == null) {
                throw new IllegalArgumentException("Unknown questionId: " + answer.questionId());
            }

            QuizSubmissionResponse.QuestionResult result = gradeQuestion(q, answer);
            if (result.correct()) {
                correctCount++;
            }
            results.add(result);

            persistQuizAttempt(userId, kitId, q.questionId(), answer.selectedOptionIndex(), answer.answerText(), result.correct());
        }

        // Unanswered questions are implicitly wrong. The total comes from the kit.
        int totalQuestions = validQuestions.size();
        double percentage = totalQuestions == 0 ? 0 : ((double) correctCount / totalQuestions) * 100.0;
        boolean passed = percentage >= properties.getQuizPassThresholdPercent();

        boolean alreadyPassed = submissionLog.hasPassedQuiz(userId, kitId);
        boolean xpEligible = passed && !alreadyPassed;

        if (xpEligible) {
            submissionLog.markQuizPassed(userId, kitId);
        }

        QuizSubmissionResponse response = new QuizSubmissionResponse(
                correctCount, totalQuestions, percentage, passed, xpEligible, results);
        
        submissionLog.putIfAbsent(userId, submissionIdStr, payloadHash, response, Instant.now(clock));

        if (xpEligible) {
            String eventId = userId + ":QUIZ:" + submissionIdStr;
            publisher.publishEvent(new UserActionCompletedEvent(eventId, userId, null, ActionType.QUIZ_PASSED, correctCount));
        }

        return response;
    }

    public List<CardSchedule> getDueCards(Long userId, String kitId, Integer limit) {
        StoredStudyKit kit = kitStore.findById(kitId)
                .filter(k -> k.ownerId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));

        int actualLimit = limit != null ? Math.min(limit, properties.getMaxDueLimit()) : properties.getDefaultDueLimit();
        LocalDate today = LocalDate.now(clock);

        List<CardSchedule> existingSchedules = scheduleStore.findByUserIdAndKitId(userId, kitId);
        Map<String, CardSchedule> scheduleMap = new HashMap<>();
        for (CardSchedule s : existingSchedules) scheduleMap.put(s.cardId(), s);

        List<CardSchedule> dueCards = new ArrayList<>();
        for (StoredTopicKit t : kit.topics()) {
            for (StoredFlashcard f : t.flashcards()) {
                CardSchedule s = scheduleMap.getOrDefault(f.cardId(), CardSchedule.newCard(f.cardId(), properties.getInitialEaseFactor(), today));
                if (s.isDue(today)) {
                    dueCards.add(s);
                }
            }
        }

        dueCards.sort(Comparator.comparing(CardSchedule::dueDate, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(CardSchedule::easeFactor));

        return dueCards.stream().limit(actualLimit).toList();
    }

    public ProgressResponse getProgress(Long userId, String kitId) {
        StoredStudyKit kit = kitStore.findById(kitId)
                .filter(k -> k.ownerId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));

        LocalDate today = LocalDate.now(clock);
        List<CardSchedule> existingSchedules = scheduleStore.findByUserIdAndKitId(userId, kitId);
        Map<String, CardSchedule> scheduleMap = new HashMap<>();
        for (CardSchedule s : existingSchedules) scheduleMap.put(s.cardId(), s);

        int total = 0, newCards = 0, learning = 0, mature = 0, dueToday = 0;
        double sumEf = 0;
        LocalDate nextDue = null;

        for (StoredTopicKit t : kit.topics()) {
            for (StoredFlashcard f : t.flashcards()) {
                total++;
                CardSchedule s = scheduleMap.getOrDefault(f.cardId(), CardSchedule.newCard(f.cardId(), properties.getInitialEaseFactor(), today));
                sumEf += s.easeFactor();

                if (s.repetitions() == 0) newCards++;
                else if (s.intervalDays() < 21) learning++;
                else mature++;

                if (s.isDue(today)) dueToday++;
                
                if (s.dueDate() != null) {
                    if (nextDue == null || s.dueDate().isBefore(nextDue)) {
                        nextDue = s.dueDate();
                    }
                }
            }
        }

        double avgEf = total == 0 ? 0 : Math.round((sumEf / total) * 100.0) / 100.0;
        return new ProgressResponse(total, newCards, learning, mature, dueToday, avgEf, nextDue);
    }

    public List<ClientQuizQuestion> getQuizQuestions(Long userId, String kitId) {
        StoredStudyKit kit = kitStore.findById(kitId)
                .filter(k -> k.ownerId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));

        List<ClientQuizQuestion> questions = new ArrayList<>();
        for (StoredTopicKit t : kit.topics()) {
            for (StoredQuizQuestion q : t.quiz()) {
                questions.add(ClientQuizQuestion.fromStored(q, t.ref(), t.chapterTitle()));
            }
        }
        return questions;
    }

    public QuizSubmissionResponse.QuestionResult checkQuestion(
            Long userId,
            String kitId,
            QuizSubmissionRequest.QuizAnswer answer) {
        StoredStudyKit kit = kitStore.findById(kitId)
                .filter(k -> k.ownerId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Study kit not found"));

        StoredQuizQuestion q = kit.findQuestion(answer.questionId())
                .orElseThrow(() -> new IllegalArgumentException("Unknown questionId: " + answer.questionId()));

        return gradeQuestion(q, answer);
    }

    private QuizSubmissionResponse.QuestionResult gradeQuestion(
            StoredQuizQuestion q,
            QuizSubmissionRequest.QuizAnswer answer) {
        String qType = q.type() != null ? q.type().toUpperCase(Locale.ROOT) : "MCQ";

        if ("SHORT_ANSWER".equals(qType) || "TEXT".equals(qType)) {
            String expected = q.correctAnswerText() != null ? q.correctAnswerText().trim() :
                    (q.options() != null && !q.options().isEmpty() ? q.options().get(0).trim() : "");
            String given = answer.answerText() != null ? answer.answerText().trim() : "";

            boolean autoCorrect = isShortAnswerCorrect(given, expected);
            boolean isCorrect = autoCorrect || (Boolean.TRUE.equals(answer.selfAssessedCorrect()) && !given.isBlank());
            return new QuizSubmissionResponse.QuestionResult(
                    q.questionId(), isCorrect, q.correctOptionIndex(), expected, q.explanation());
        }

        if (answer.selectedOptionIndex() == null || answer.selectedOptionIndex() < 0 ||
                (q.options() != null && answer.selectedOptionIndex() >= q.options().size())) {
            throw new IllegalArgumentException("Option index out of range for question: " + answer.questionId());
        }

        boolean isCorrect = (answer.selectedOptionIndex() == q.correctOptionIndex());
        String expectedText = q.correctAnswerText();
        if (expectedText == null && q.options() != null && q.correctOptionIndex() >= 0 && q.correctOptionIndex() < q.options().size()) {
            expectedText = q.options().get(q.correctOptionIndex());
        }

        return new QuizSubmissionResponse.QuestionResult(
                q.questionId(), isCorrect, q.correctOptionIndex(), expectedText, q.explanation());
    }

    public boolean isShortAnswerCorrect(String given, String expected) {
        if (given == null || given.isBlank() || expected == null || expected.isBlank()) {
            return false;
        }
        String normGiven = normalizeAnswer(given);
        String normExpected = normalizeAnswer(expected);
        if (normGiven.isEmpty() || normExpected.isEmpty()) {
            return false;
        }
        if (normGiven.equals(normExpected)) {
            return true;
        }

        String cleanGiven = stripLeadingArticles(normGiven);
        String cleanExpected = stripLeadingArticles(normExpected);
        if (cleanGiven.equals(cleanExpected)) {
            return true;
        }

        List<String> givenTokens = tokenize(cleanGiven);
        List<String> expectedTokens = tokenize(cleanExpected);
        if (givenTokens.isEmpty() || expectedTokens.isEmpty()) {
            return false;
        }

        // Single-token expected answer: exact match (already checked) or narrow typo tolerance, never arbitrary substring
        if (expectedTokens.size() == 1 && givenTokens.size() == 1) {
            return isTokenMatch(givenTokens.get(0), expectedTokens.get(0));
        }

        // Multi-token expected or phrasing variations: require high token overlap and comparable length
        if (expectedTokens.size() >= 2) {
            int matched = 0;
            for (String expTok : expectedTokens) {
                for (String givTok : givenTokens) {
                    if (isTokenMatch(givTok, expTok)) {
                        matched++;
                        break;
                    }
                }
            }
            double coverage = (double) matched / expectedTokens.size();
            boolean enoughLength = cleanGiven.length() >= Math.round(cleanExpected.length() * 0.65);
            boolean enoughTokens = givenTokens.size() >= Math.ceil(expectedTokens.size() * 0.65);
            return coverage >= 0.8 && enoughLength && enoughTokens;
        }

        // Expected is single token (>= 3 chars) embedded cleanly as a full token inside a short explanatory phrase (e.g. "it is Paris")
        String target = expectedTokens.get(0);
        if (target.length() >= 3 && givenTokens.size() <= 4) {
            for (String givTok : givenTokens) {
                if (givTok.equals(target)) {
                    return true;
                }
            }
        }

        return false;
    }

    public String normalizeAnswer(String s) {
        if (s == null) {
            return "";
        }
        String normalized = Normalizer.normalize(s, Normalizer.Form.NFKC);
        // Strip Arabic diacritics (tashkeel), tatweel, and Unicode combining marks
        normalized = normalized.replaceAll("[\\u064B-\\u065F\\u0670\\u0640\\p{M}]", "");
        // Unify Arabic Alef forms, Teh Marbuta, and Alef Maqsura
        normalized = normalized
                .replace('\u0623', '\u0627') // أ -> ا
                .replace('\u0625', '\u0627') // إ -> ا
                .replace('\u0622', '\u0627') // آ -> ا
                .replace('\u0671', '\u0627') // ٱ -> ا
                .replace('\u0629', '\u0647') // ة -> ه
                .replace('\u0649', '\u064A'); // ى -> ي
        // Convert Arabic-Indic and Eastern Arabic-Indic digits to ASCII digits
        StringBuilder sb = new StringBuilder(normalized.length());
        for (int i = 0; i < normalized.length(); i++) {
            char ch = normalized.charAt(i);
            if (ch >= '\u0660' && ch <= '\u0669') {
                sb.append((char) ('0' + (ch - '\u0660')));
            } else if (ch >= '\u06F0' && ch <= '\u06F9') {
                sb.append((char) ('0' + (ch - '\u06F0')));
            } else {
                sb.append(ch);
            }
        }
        return sb.toString()
                .trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String stripLeadingArticles(String normalized) {
        if (normalized.isEmpty()) {
            return normalized;
        }
        String[] parts = normalized.split("\\s+");
        List<String> cleaned = new ArrayList<>(parts.length);
        for (String p : parts) {
            if ("the".equals(p) || "a".equals(p) || "an".equals(p)) {
                continue;
            }
            if (p.startsWith("\u0627\u0644") && p.length() >= 5) { // strip "ال" prefix when stem >= 3 chars
                cleaned.add(p.substring(2));
            } else {
                cleaned.add(p);
            }
        }
        return String.join(" ", cleaned).trim();
    }

    private List<String> tokenize(String s) {
        if (s == null || s.isBlank()) {
            return List.of();
        }
        String[] raw = s.trim().split("\\s+");
        List<String> tokens = new ArrayList<>(raw.length);
        for (String r : raw) {
            if (!r.isEmpty()) {
                tokens.add(r);
            }
        }
        return tokens;
    }

    private boolean isTokenMatch(String given, String expected) {
        if (given.equals(expected)) {
            return true;
        }
        int len = expected.length();
        int maxDist = len >= 10 ? 2 : (len >= 5 ? 1 : 0);
        if (maxDist == 0) {
            return false;
        }
        if (Math.abs(given.length() - expected.length()) > maxDist) {
            return false;
        }
        return levenshteinDistance(given, expected) <= maxDist;
    }

    private int levenshteinDistance(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost);
            }
        }
        return dp[a.length()][b.length()];
    }

    private void persistQuizAttempt(
            Long userId,
            String kitId,
            String questionId,
            Integer selectedOption,
            String answerText,
            boolean isCorrect) {
        if (quizAttemptRepository == null || quizQuestionRepository == null || studentRepository == null) {
            return;
        }
        Optional<Student> studentOpt = studentRepository.findById(userId);
        if (studentOpt.isEmpty()) {
            return;
        }
        Optional<QuizQuestion> questionOpt = Optional.empty();
        if (questionId != null) {
            try {
                questionOpt = quizQuestionRepository.findById(Long.parseLong(questionId.trim()));
            } catch (NumberFormatException ignored) {}
            if (questionOpt.isEmpty()) {
                questionOpt = quizQuestionRepository.findFirstByKitIdAndExternalId(kitId, questionId);
            }
        }
        if (questionOpt.isEmpty()) {
            return;
        }
        QuizAttempt attempt = QuizAttempt.builder()
                .student(studentOpt.get())
                .question(questionOpt.get())
                .selectedOption(selectedOption)
                .answerText(answerText)
                .isCorrect(isCorrect)
                .build();
        quizAttemptRepository.save(attempt);
    }
}
