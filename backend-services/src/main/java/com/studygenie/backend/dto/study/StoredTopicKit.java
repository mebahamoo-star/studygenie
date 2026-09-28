package com.studygenie.backend.dto.study;

import java.util.List;

public record StoredTopicKit(
        String ref,
        List<StoredFlashcard> flashcards,
        List<StoredQuizQuestion> quiz
) {}
