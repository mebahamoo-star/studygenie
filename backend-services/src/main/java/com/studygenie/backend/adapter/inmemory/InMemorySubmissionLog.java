package com.studygenie.backend.adapter.inmemory;

import com.studygenie.backend.config.StudyLogicProperties;
import com.studygenie.backend.service.port.SubmissionLog;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// TODO(persistence): Replace with JPA repository
@Component
public class InMemorySubmissionLog implements SubmissionLog {

    // Key: userId:submissionId
    private final ConcurrentHashMap<String, SubmissionRecord> submissions = new ConcurrentHashMap<>();
    
    // Key: userId:kitId
    private final ConcurrentHashMap<String, Boolean> passedQuizzes = new ConcurrentHashMap<>();

    private final StudyLogicProperties properties;
    private final Clock clock;

    public InMemorySubmissionLog(StudyLogicProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    public SubmissionRecord get(Long userId, String submissionId) {
        evictOldSubmissions();
        return submissions.get(userId + ":" + submissionId);
    }

    @Override
    public SubmissionRecord putIfAbsent(Long userId, String submissionId, int payloadHash, Object response, Instant createdAt) {
        evictOldSubmissions();
        String key = userId + ":" + submissionId;
        SubmissionRecord newRecord = new SubmissionRecord(submissionId, payloadHash, response, createdAt);
        return submissions.putIfAbsent(key, newRecord);
    }

    @Override
    public boolean hasPassedQuiz(Long userId, String kitId) {
        return passedQuizzes.getOrDefault(userId + ":" + kitId, false);
    }

    @Override
    public void markQuizPassed(Long userId, String kitId) {
        passedQuizzes.put(userId + ":" + kitId, true);
    }

    private void evictOldSubmissions() {
        Instant cutoff = Instant.now(clock).minus(properties.getSubmissionLogTtlHours(), ChronoUnit.HOURS);
        submissions.entrySet().removeIf(e -> e.getValue().createdAt().isBefore(cutoff));
    }
}
