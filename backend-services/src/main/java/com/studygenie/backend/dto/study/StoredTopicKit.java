package com.studygenie.backend.dto.study;

import java.util.List;

public record StoredTopicKit(
        String ref,
        String chapterTitle,
        List<StoredFlashcard> flashcards,
        List<StoredQuizQuestion> quiz
) {
    public StoredTopicKit(String ref, List<StoredFlashcard> flashcards, List<StoredQuizQuestion> quiz) {
        this(ref, null, flashcards, quiz);
    }
}
