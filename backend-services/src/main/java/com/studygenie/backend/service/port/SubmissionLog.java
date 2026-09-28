package com.studygenie.backend.service.port;

import java.time.Instant;

public interface SubmissionLog {
    
    public record SubmissionRecord(String submissionId, int payloadHash, Object response, Instant createdAt) {}

    SubmissionRecord get(Long userId, String submissionId);
    
    SubmissionRecord putIfAbsent(Long userId, String submissionId, int payloadHash, Object response, Instant createdAt);
    
    boolean hasPassedQuiz(Long userId, String kitId);
    
    void markQuizPassed(Long userId, String kitId);
}
