package com.studygenie.backend.dto.study;

import java.util.List;

public record ClientQuizQuestion(
        String questionId,
        String type,
        String question,
        List<String> options
) {
    public static ClientQuizQuestion fromStored(StoredQuizQuestion stored) {
        return new ClientQuizQuestion(
                stored.questionId(),
                stored.type(),
                stored.question(),
                stored.options()
        );
    }
}
