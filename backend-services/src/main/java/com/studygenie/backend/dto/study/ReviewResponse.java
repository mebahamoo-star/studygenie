package com.studygenie.backend.dto.study;

import java.util.List;

public record ReviewResponse(
        int reviewed,
        int counted,
        int againCount,
        int hardCount,
        int goodCount,
        int easyCount,
        List<CardSchedule> updatedSchedules
) {}
