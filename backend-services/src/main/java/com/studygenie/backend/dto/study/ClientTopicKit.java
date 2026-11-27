package com.studygenie.backend.dto.study;

import java.util.List;

public record ClientTopicKit(
        String ref,
        String chapterTitle,
        List<StoredFlashcard> flashcards,
        List<ClientQuizQuestion> quiz
) {
    public ClientTopicKit(String ref, List<StoredFlashcard> flashcards, List<ClientQuizQuestion> quiz) {
        this(ref, null, flashcards, quiz);
    }

    public static ClientTopicKit fromStored(StoredTopicKit stored) {
        return new ClientTopicKit(
                stored.ref(),
                stored.chapterTitle(),
                stored.flashcards(),
                stored.quiz().stream().map(q -> ClientQuizQuestion.fromStored(q, stored.ref(), stored.chapterTitle())).toList()
        );
    }
}
