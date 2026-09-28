package com.studygenie.backend.dto.study;

public record StoredFlashcard(
        String cardId,
        String front,
        String back
) {}
