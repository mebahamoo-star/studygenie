package com.studygenie.backend.adapter.jpa;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.dto.study.QuizSubmissionResponse;
import com.studygenie.backend.dto.study.ReviewResponse;
import com.studygenie.backend.entity.StudyKit;
import com.studygenie.backend.entity.StudySessionSubmission;
import com.studygenie.backend.repository.StudyKitRepository;
import com.studygenie.backend.repository.StudySessionSubmissionRepository;
import com.studygenie.backend.service.port.SubmissionLog;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Primary
public class JpaSubmissionLog implements SubmissionLog {

    private static final String TYPE_REVIEW = "REVIEW";
    private static final String TYPE_QUIZ = "QUIZ";

    private final StudySessionSubmissionRepository submissionRepository;
    private final StudyKitRepository studyKitRepository;
    private final StudyLogicProperties properties;
    private final Clock clock;
    private final ObjectMapper objectMapper;
    private final Set<String> passedFallback = ConcurrentHashMap.newKeySet();

    public JpaSubmissionLog(
            StudySessionSubmissionRepository submissionRepository,
            StudyKitRepository studyKitRepository,
            StudyLogicProperties properties,
            Clock clock) {
        this.submissionRepository = submissionRepository;
        this.studyKitRepository = studyKitRepository;
        this.properties = properties;
        this.clock = clock;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Override
    @Transactional
    public SubmissionRecord get(Long userId, String submissionId) {
        if (userId == null || submissionId == null) return null;
        Optional<StudySessionSubmission> opt = submissionRepository.findByUserIdAndSubmissionId(userId, submissionId);
        if (opt.isEmpty()) return null;

        StudySessionSubmission entity = opt.get();
        Instant cutoff = Instant.now(clock).minus(properties.getSubmissionLogTtlHours(), ChronoUnit.HOURS);
        if (entity.getCreatedAt().isBefore(cutoff)) {
            submissionRepository.delete(entity);
            return null;
        }
        return toRecord(entity);
    }

    @Override
    @Transactional
    public SubmissionRecord putIfAbsent(Long userId, String submissionId, int payloadHash, Object response, Instant createdAt) {
        Optional<StudySessionSubmission> existing = submissionRepository.findByUserIdAndSubmissionId(userId, submissionId);
        Instant cutoff = Instant.now(clock).minus(properties.getSubmissionLogTtlHours(), ChronoUnit.HOURS);
        if (existing.isPresent()) {
            if (!existing.get().getCreatedAt().isBefore(cutoff)) {
                return toRecord(existing.get());
            }
            submissionRepository.delete(existing.get());
            submissionRepository.flush();
        }

        String responseType = response instanceof QuizSubmissionResponse ? TYPE_QUIZ : TYPE_REVIEW;
        String json = writeJson(response);

        StudySessionSubmission entity = StudySessionSubmission.builder()
                .userId(userId)
                .submissionId(submissionId)
                .payloadHash(payloadHash)
                .responseType(responseType)
                .responseJson(json)
                .createdAt(createdAt != null ? createdAt : Instant.now(clock))
                .build();

        try {
            submissionRepository.saveAndFlush(entity);
            return null;
        } catch (DataIntegrityViolationException ex) {
            return submissionRepository.findByUserIdAndSubmissionId(userId, submissionId)
                    .map(this::toRecord)
                    .orElse(null);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasPassedQuiz(Long userId, String kitId) {
        if (kitId == null || userId == null) return false;
        Optional<StudyKit> kitOpt = studyKitRepository.findById(kitId);
        if (kitOpt.isPresent()) {
            StudyKit kit = kitOpt.get();
            if (kit.getStudent() != null && userId.equals(kit.getStudent().getId())) {
                return Boolean.TRUE.equals(kit.getQuizPassed());
            }
        }
        return passedFallback.contains(userId + ":" + kitId);
    }

    @Override
    @Transactional
    public void markQuizPassed(Long userId, String kitId) {
        if (kitId == null || userId == null) return;
        passedFallback.add(userId + ":" + kitId);
        studyKitRepository.findById(kitId).ifPresent(kit -> {
            if (kit.getStudent() != null && userId.equals(kit.getStudent().getId())) {
                kit.setQuizPassed(true);
                studyKitRepository.save(kit);
            }
        });
    }

    private SubmissionRecord toRecord(StudySessionSubmission entity) {
        Object parsed = readResponse(entity.getResponseType(), entity.getResponseJson());
        return new SubmissionRecord(entity.getSubmissionId(), entity.getPayloadHash(), parsed, entity.getCreatedAt());
    }

    private String writeJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize submission response", e);
        }
    }

    private Object readResponse(String type, String json) {
        try {
            if (TYPE_QUIZ.equals(type)) {
                return objectMapper.readValue(json, QuizSubmissionResponse.class);
            }
            return objectMapper.readValue(json, ReviewResponse.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize submission response", e);
        }
    }
}
