package com.studygenie.backend.dto.study;

import java.util.List;

public record ClientTopicKit(
        String ref,
        List<StoredFlashcard> flashcards,
        List<ClientQuizQuestion> quiz
) {
    public static ClientTopicKit fromStored(StoredTopicKit stored) {
        return new ClientTopicKit(
                stored.ref(),
                stored.flashcards(),
                stored.quiz().stream().map(ClientQuizQuestion::fromStored).toList()
        );
    }
}
