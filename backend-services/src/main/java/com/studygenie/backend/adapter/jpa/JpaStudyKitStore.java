package com.studygenie.backend.adapter.jpa;

import com.studygenie.backend.dto.study.StoredFlashcard;
import com.studygenie.backend.dto.study.StoredQuizQuestion;
import com.studygenie.backend.dto.study.StoredStudyKit;
import com.studygenie.backend.dto.study.StoredTopicKit;
import com.studygenie.backend.entity.*;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.entity.enums.QuestionType;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.repository.*;
import com.studygenie.backend.service.port.StudyKitStore;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Primary
public class JpaStudyKitStore implements StudyKitStore {

    private final StudyKitRepository studyKitRepository;
    private final FlashcardRepository flashcardRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final SyllabusRepository syllabusRepository;
    private final TopicRepository topicRepository;
    private final CollegeRepository collegeRepository;
    private final UniversityRepository universityRepository;

    public JpaStudyKitStore(
            StudyKitRepository studyKitRepository,
            FlashcardRepository flashcardRepository,
            QuizQuestionRepository quizQuestionRepository,
            StudentRepository studentRepository,
            CourseRepository courseRepository,
            SyllabusRepository syllabusRepository,
            TopicRepository topicRepository,
            CollegeRepository collegeRepository,
            UniversityRepository universityRepository) {
        this.studyKitRepository = studyKitRepository;
        this.flashcardRepository = flashcardRepository;
        this.quizQuestionRepository = quizQuestionRepository;
        this.studentRepository = studentRepository;
        this.courseRepository = courseRepository;
        this.syllabusRepository = syllabusRepository;
        this.topicRepository = topicRepository;
        this.collegeRepository = collegeRepository;
        this.universityRepository = universityRepository;
    }

    @Override
    @Transactional
    public void save(StoredStudyKit kit) {
        saveAndReturn(kit);
    }

    @Override
    @Transactional
    public StoredStudyKit saveAndReturn(StoredStudyKit kit) {
        Student student = studentRepository.findById(kit.ownerId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found: " + kit.ownerId()));

        String kitId = (kit.kitId() != null && !kit.kitId().isBlank())
                ? kit.kitId()
                : UUID.randomUUID().toString();

        StudyKit studyKit = studyKitRepository.findById(kitId)
                .orElseGet(() -> StudyKit.builder()
                        .id(kitId)
                        .student(student)
                        .courseId(kit.courseId())
                        .courseName(kit.courseName())
                        .language(kit.language() != null && !kit.language().isBlank() ? kit.language() : "en")
                        .quizPassed(false)
                        .build());

        if (kit.courseId() != null) studyKit.setCourseId(kit.courseId());
        if (kit.courseName() != null) studyKit.setCourseName(kit.courseName());
        if (kit.language() != null && !kit.language().isBlank()) studyKit.setLanguage(kit.language());
        studyKitRepository.save(studyKit);

        List<StoredTopicKit> savedTopics = new ArrayList<>();
        if (kit.topics() != null) {
            for (StoredTopicKit topicKit : kit.topics()) {
                Topic resolvedTopic = resolveOrCreateTopic(kit, topicKit, student);
                String topicRef = topicKit.ref() != null && !topicKit.ref().isBlank()
                        ? topicKit.ref()
                        : String.valueOf(resolvedTopic.getId());
                String chapterTitle = (topicKit.chapterTitle() != null && !topicKit.chapterTitle().isBlank())
                        ? topicKit.chapterTitle()
                        : resolvedTopic.getChapterTitle();

                List<StoredFlashcard> savedCards = new ArrayList<>();
                if (topicKit.flashcards() != null) {
                    for (StoredFlashcard fc : topicKit.flashcards()) {
                        Flashcard entity = null;
                        Long existingId = tryParseLong(fc.cardId());
                        if (existingId != null) {
                            entity = flashcardRepository.findById(existingId).orElse(null);
                        }
                        if (entity == null) {
                            entity = Flashcard.builder()
                                    .topic(resolvedTopic)
                                    .frontText(fc.front() != null && !fc.front().isBlank() ? fc.front() : "Question")
                                    .backText(fc.back() != null && !fc.back().isBlank() ? fc.back() : "Answer")
                                    .build();
                        }
                        entity.setKitId(kitId);
                        entity.setTopicRef(topicRef);
                        entity.setChapterTitle(chapterTitle);
                        entity.setStudentId(student.getId());
                        if (fc.cardId() != null && !fc.cardId().isBlank()) {
                            entity.setExternalId(fc.cardId());
                        }
                        Flashcard persisted = flashcardRepository.save(entity);
                        String effectiveCardId = (fc.cardId() != null && !fc.cardId().isBlank())
                                ? fc.cardId()
                                : String.valueOf(persisted.getId());
                        if (persisted.getExternalId() == null) {
                            persisted.setExternalId(effectiveCardId);
                            flashcardRepository.save(persisted);
                        }
                        savedCards.add(new StoredFlashcard(effectiveCardId, persisted.getFrontText(), persisted.getBackText()));
                    }
                }

                List<StoredQuizQuestion> savedQuestions = new ArrayList<>();
                if (topicKit.quiz() != null) {
                    for (StoredQuizQuestion q : topicKit.quiz()) {
                        QuizQuestion entity = null;
                        Long existingId = tryParseLong(q.questionId());
                        if (existingId != null) {
                            entity = quizQuestionRepository.findById(existingId).orElse(null);
                        }
                        QuestionType qType = parseQuestionType(q.type());
                        if (entity == null) {
                            entity = QuizQuestion.builder()
                                    .topic(resolvedTopic)
                                    .questionText(q.question() != null && !q.question().isBlank() ? q.question() : "Question")
                                    .type(qType)
                                    .options(q.options() != null ? new ArrayList<>(q.options()) : List.of())
                                    .correctOptionIndex(q.correctOptionIndex())
                                    .correctAnswerText(q.correctAnswerText())
                                    .explanation(q.explanation())
                                    .build();
                        }
                        entity.setKitId(kitId);
                        entity.setTopicRef(topicRef);
                        entity.setChapterTitle(chapterTitle);
                        entity.setStudentId(student.getId());
                        if (q.questionId() != null && !q.questionId().isBlank()) {
                            entity.setExternalId(q.questionId());
                        }
                        QuizQuestion persisted = quizQuestionRepository.save(entity);
                        String effectiveQuestionId = (q.questionId() != null && !q.questionId().isBlank())
                                ? q.questionId()
                                : String.valueOf(persisted.getId());
                        if (persisted.getExternalId() == null) {
                            persisted.setExternalId(effectiveQuestionId);
                            quizQuestionRepository.save(persisted);
                        }
                        savedQuestions.add(new StoredQuizQuestion(
                                effectiveQuestionId,
                                persisted.getType().name(),
                                persisted.getQuestionText(),
                                persisted.getOptions() != null ? persisted.getOptions() : List.of(),
                                persisted.getCorrectOptionIndex() != null ? persisted.getCorrectOptionIndex() : 0,
                                persisted.getCorrectAnswerText(),
                                persisted.getExplanation()
                        ));
                    }
                }

                savedTopics.add(new StoredTopicKit(topicRef, chapterTitle, savedCards, savedQuestions));
            }
        }

        return new StoredStudyKit(
                kitId,
                student.getId(),
                studyKit.getCourseId(),
                studyKit.getCourseName(),
                studyKit.getLanguage(),
                savedTopics
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<StoredStudyKit> findById(String kitId) {
        if (kitId == null || kitId.isBlank()) {
            return Optional.empty();
        }
        return studyKitRepository.findById(kitId).map(this::toStoredStudyKit);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoredStudyKit> findByUserId(Long userId) {
        if (userId == null) return List.of();
        return studyKitRepository.findByStudentIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toStoredStudyKit)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoredStudyKit> findByUserIdAndCourseId(Long userId, Long courseId) {
        if (userId == null || courseId == null) return List.of();
        return studyKitRepository.findByStudentIdAndCourseIdOrderByCreatedAtDesc(userId, courseId).stream()
                .map(this::toStoredStudyKit)
                .collect(Collectors.toList());
    }

    private StoredStudyKit toStoredStudyKit(StudyKit kit) {
        List<Flashcard> cards = flashcardRepository.findByKitIdOrderByIdAsc(kit.getId());
        List<QuizQuestion> questions = quizQuestionRepository.findByKitIdOrderByIdAsc(kit.getId());

        Map<String, List<StoredFlashcard>> cardsByRef = new LinkedHashMap<>();
        Map<String, String> titleByRef = new HashMap<>();

        for (Flashcard c : cards) {
            String ref = c.getTopicRef() != null && !c.getTopicRef().isBlank()
                    ? c.getTopicRef()
                    : (c.getTopic() != null ? String.valueOf(c.getTopic().getId()) : "1");
            if (c.getChapterTitle() != null && !c.getChapterTitle().isBlank()) {
                titleByRef.putIfAbsent(ref, c.getChapterTitle());
            } else if (c.getTopic() != null && c.getTopic().getChapterTitle() != null) {
                titleByRef.putIfAbsent(ref, c.getTopic().getChapterTitle());
            }
            String cardId = (c.getExternalId() != null && !c.getExternalId().isBlank())
                    ? c.getExternalId()
                    : String.valueOf(c.getId());
            cardsByRef.computeIfAbsent(ref, k -> new ArrayList<>())
                    .add(new StoredFlashcard(cardId, c.getFrontText(), c.getBackText()));
        }

        Map<String, List<StoredQuizQuestion>> questionsByRef = new LinkedHashMap<>();
        for (QuizQuestion q : questions) {
            String ref = q.getTopicRef() != null && !q.getTopicRef().isBlank()
                    ? q.getTopicRef()
                    : (q.getTopic() != null ? String.valueOf(q.getTopic().getId()) : "1");
            if (q.getChapterTitle() != null && !q.getChapterTitle().isBlank()) {
                titleByRef.putIfAbsent(ref, q.getChapterTitle());
            } else if (q.getTopic() != null && q.getTopic().getChapterTitle() != null) {
                titleByRef.putIfAbsent(ref, q.getTopic().getChapterTitle());
            }
            String qId = (q.getExternalId() != null && !q.getExternalId().isBlank())
                    ? q.getExternalId()
                    : String.valueOf(q.getId());
            questionsByRef.computeIfAbsent(ref, k -> new ArrayList<>())
                    .add(new StoredQuizQuestion(
                            qId,
                            q.getType() != null ? q.getType().name() : "MCQ",
                            q.getQuestionText(),
                            q.getOptions() != null ? q.getOptions() : List.of(),
                            q.getCorrectOptionIndex() != null ? q.getCorrectOptionIndex() : 0,
                            q.getCorrectAnswerText(),
                            q.getExplanation()
                    ));
        }

        Set<String> allRefs = new LinkedHashSet<>();
        allRefs.addAll(cardsByRef.keySet());
        allRefs.addAll(questionsByRef.keySet());

        List<StoredTopicKit> topicKits = new ArrayList<>();
        for (String ref : allRefs) {
            topicKits.add(new StoredTopicKit(
                    ref,
                    titleByRef.get(ref),
                    cardsByRef.getOrDefault(ref, List.of()),
                    questionsByRef.getOrDefault(ref, List.of())
            ));
        }

        return new StoredStudyKit(
                kit.getId(),
                kit.getStudent() != null ? kit.getStudent().getId() : null,
                kit.getCourseId(),
                kit.getCourseName(),
                kit.getLanguage(),
                topicKits
        );
    }

    private Topic resolveOrCreateTopic(StoredStudyKit kit, StoredTopicKit topicKit, Student student) {
        Long refId = tryParseLong(topicKit.ref());
        if (refId != null) {
            Optional<Topic> direct = topicRepository.findById(refId);
            if (direct.isPresent()) {
                return direct.get();
            }
        }

        if (topicKit.flashcards() != null) {
            for (StoredFlashcard fc : topicKit.flashcards()) {
                Long cid = tryParseLong(fc.cardId());
                if (cid != null) {
                    Optional<Flashcard> existingCard = flashcardRepository.findById(cid);
                    if (existingCard.isPresent() && existingCard.get().getTopic() != null) {
                        return existingCard.get().getTopic();
                    }
                }
            }
        }

        Course course = null;
        if (kit.courseId() != null) {
            course = courseRepository.findById(kit.courseId()).orElse(null);
        }
        if (course == null && kit.courseName() != null && !kit.courseName().isBlank()) {
            course = courseRepository.findFirstByNameIgnoreCase(kit.courseName().trim()).orElse(null);
        }
        if (course != null) {
            Syllabus syl = syllabusRepository.findByCourseId(course.getId()).orElse(null);
            if (syl != null) {
                List<Topic> existingTopics = topicRepository.findBySyllabusId(syl.getId());
                if (topicKit.chapterTitle() != null && !topicKit.chapterTitle().isBlank()) {
                    for (Topic t : existingTopics) {
                        if (t.getChapterTitle() != null && t.getChapterTitle().equalsIgnoreCase(topicKit.chapterTitle().trim())) {
                            return t;
                        }
                    }
                }
                if (!existingTopics.isEmpty()) {
                    return existingTopics.get(0);
                }
            } else {
                syl = syllabusRepository.save(Syllabus.builder().course(course).uploadedBy(student).build());
            }
            int nextOrder = topicRepository.findBySyllabusId(syl.getId()).stream()
                    .mapToInt(Topic::getOrderIndex)
                    .max()
                    .orElse(0) + 1;
            String title = (topicKit.chapterTitle() != null && !topicKit.chapterTitle().isBlank())
                    ? topicKit.chapterTitle()
                    : (course.getName() + " Topic " + nextOrder);
            return topicRepository.save(Topic.builder()
                    .syllabus(syl)
                    .chapterTitle(title)
                    .orderIndex(nextOrder)
                    .estimatedHours(1.0)
                    .importance(3)
                    .build());
        }

        // Last resort fallback for standalone kits without course hierarchy
        List<Topic> anyTopics = topicRepository.findAll();
        if (!anyTopics.isEmpty()) {
            return anyTopics.get(0);
        }
        University uni = universityRepository.findAll().stream().findFirst().orElseGet(() ->
                universityRepository.save(University.builder().name("General University").build()));
        College college = collegeRepository.findAll().stream().findFirst().orElseGet(() ->
                collegeRepository.save(College.builder().name("General College").university(uni).build()));
        Course fallbackCourse = courseRepository.findFirstByNameIgnoreCase("General Studies").orElseGet(() ->
                courseRepository.save(Course.builder().name("General Studies").college(college).status(CourseStatus.READY).build()));
        Syllabus fallbackSyl = syllabusRepository.findByCourseId(fallbackCourse.getId()).orElseGet(() ->
                syllabusRepository.save(Syllabus.builder().course(fallbackCourse).uploadedBy(student).build()));
        return topicRepository.save(Topic.builder()
                .syllabus(fallbackSyl)
                .chapterTitle(topicKit.chapterTitle() != null && !topicKit.chapterTitle().isBlank() ? topicKit.chapterTitle() : "General Topic")
                .orderIndex(1)
                .estimatedHours(1.0)
                .importance(3)
                .build());
    }

    private QuestionType parseQuestionType(String raw) {
        if (raw == null || raw.isBlank()) return QuestionType.MCQ;
        return switch (raw.trim().toUpperCase(Locale.ROOT)) {
            case "TRUE_FALSE", "TF", "BOOL", "BOOLEAN" -> QuestionType.TRUE_FALSE;
            case "SHORT_ANSWER", "SHORT", "SA", "TEXT" -> QuestionType.SHORT_ANSWER;
            default -> QuestionType.MCQ;
        };
    }

    private Long tryParseLong(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
