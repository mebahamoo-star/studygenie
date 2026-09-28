package com.studygenie.backend.dto.study;

import com.studygenie.backend.enums.ReviewRating;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record ReviewRequest(
        @NotNull UUID submissionId,
        @NotNull List<ReviewItem> items
) {
    public record ReviewItem(
            @NotNull String cardId,
            @NotNull ReviewRating rating
    ) {}
}
