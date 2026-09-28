package com.studygenie.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "study")
public class StudyLogicProperties {
    private double initialEaseFactor = 2.5;
    private double minEaseFactor = 1.3;
    private int maxIntervalDays = 365;
    private int quizPassThresholdPercent = 70;
    private int maxReviewBatchSize = 100;
    private int maxKitsPerUser = 50;
    private int submissionLogTtlHours = 24;
    private int defaultDueLimit = 50;
    private int maxDueLimit = 200;

    public double getInitialEaseFactor() { return initialEaseFactor; }
    public void setInitialEaseFactor(double initialEaseFactor) { this.initialEaseFactor = initialEaseFactor; }

    public double getMinEaseFactor() { return minEaseFactor; }
    public void setMinEaseFactor(double minEaseFactor) { this.minEaseFactor = minEaseFactor; }

    public int getMaxIntervalDays() { return maxIntervalDays; }
    public void setMaxIntervalDays(int maxIntervalDays) { this.maxIntervalDays = maxIntervalDays; }

    public int getQuizPassThresholdPercent() { return quizPassThresholdPercent; }
    public void setQuizPassThresholdPercent(int quizPassThresholdPercent) { this.quizPassThresholdPercent = quizPassThresholdPercent; }

    public int getMaxReviewBatchSize() { return maxReviewBatchSize; }
    public void setMaxReviewBatchSize(int maxReviewBatchSize) { this.maxReviewBatchSize = maxReviewBatchSize; }

    public int getMaxKitsPerUser() { return maxKitsPerUser; }
    public void setMaxKitsPerUser(int maxKitsPerUser) { this.maxKitsPerUser = maxKitsPerUser; }

    public int getSubmissionLogTtlHours() { return submissionLogTtlHours; }
    public void setSubmissionLogTtlHours(int submissionLogTtlHours) { this.submissionLogTtlHours = submissionLogTtlHours; }

    public int getDefaultDueLimit() { return defaultDueLimit; }
    public void setDefaultDueLimit(int defaultDueLimit) { this.defaultDueLimit = defaultDueLimit; }

    public int getMaxDueLimit() { return maxDueLimit; }
    public void setMaxDueLimit(int maxDueLimit) { this.maxDueLimit = maxDueLimit; }
}
