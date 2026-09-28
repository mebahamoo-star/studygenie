package com.studygenie.backend.event;

import com.studygenie.backend.enums.ActionType;
import java.util.UUID;

public record UserActionCompletedEvent(
        String eventId,
        Long userId,
        String displayName,
        ActionType actionType,
        int baseMultiplier // e.g. number of flashcards reviewed correctly, usually 1
) {
    public static UserActionCompletedEvent create(Long userId, String displayName, ActionType actionType, int baseMultiplier) {
        return new UserActionCompletedEvent(UUID.randomUUID().toString(), userId, displayName, actionType, baseMultiplier);
    }
}
