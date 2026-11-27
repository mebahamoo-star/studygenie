package com.studygenie.backend.dto.study;

import java.util.List;

public record ClientQuizQuestion(
        String questionId,
        String type,
        String question,
        List<String> options,
        String topicRef,
        String chapterTitle
) {
    public ClientQuizQuestion(String questionId, String type, String question, List<String> options) {
        this(questionId, type, question, options, null, null);
    }

    public static ClientQuizQuestion fromStored(StoredQuizQuestion stored) {
        return new ClientQuizQuestion(
                stored.questionId(),
                stored.type(),
                stored.question(),
                stored.options()
        );
    }

    public static ClientQuizQuestion fromStored(StoredQuizQuestion stored, String topicRef, String chapterTitle) {
        return new ClientQuizQuestion(
                stored.questionId(),
                stored.type(),
                stored.question(),
                stored.options(),
                topicRef,
                chapterTitle
        );
    }
}
