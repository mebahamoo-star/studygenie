package com.studygenie.backend.dto.exam;

import java.time.LocalDate;

public record ExamDto(
    Long id,
    String course,
    String type,
    LocalDate date,
    String professor
) {}
