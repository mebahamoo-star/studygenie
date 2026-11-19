package com.studygenie.backend.dto.admin;

import java.util.List;

public record AdminPageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
