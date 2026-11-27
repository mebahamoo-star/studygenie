package com.studygenie.backend.dto.study;

import java.util.List;
import java.util.Optional;

public record StoredStudyKit(
        String kitId,
        Long ownerId,
        Long courseId,
        String courseName,
        String language,
        List<StoredTopicKit> topics
) {
    public StoredStudyKit(String kitId, Long ownerId, List<StoredTopicKit> topics) {
        this(kitId, ownerId, null, null, "en", topics);
    }

    public int totalQuestions() {
        return topics.stream()
                .mapToInt(t -> t.quiz().size())
                .sum();
    }

    public Optional<StoredQuizQuestion> findQuestion(String questionId) {
        for (StoredTopicKit topic : topics) {
            for (StoredQuizQuestion q : topic.quiz()) {
                if (q.questionId().equals(questionId)) {
                    return Optional.of(q);
                }
            }
        }
        return Optional.empty();
    }
}
