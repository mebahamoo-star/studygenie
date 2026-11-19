package com.studygenie.backend.dto.admin;

import jakarta.validation.constraints.Size;

public record AdminUpdateReportRequest(
        @Size(max = 50)
        String status,

        @Size(max = 2000)
        String adminNote
) {
}
