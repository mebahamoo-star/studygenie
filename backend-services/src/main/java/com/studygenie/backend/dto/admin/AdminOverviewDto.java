package com.studygenie.backend.dto.admin;

import java.util.List;

public record AdminOverviewDto(
        long totalUsers,
        long activeUsersToday,
        long activeUsers7d,
        long newSignupsToday,
        long newSignups7d,
        long totalCourses,
        long enrolledCount,
        long uploadsToday,
        long openReports,
        long failedAnalyses,
        List<DailyMetricPoint> dailySignups,
        List<DailyMetricPoint> dailyActivity
) {
    public record DailyMetricPoint(String date, long count) {}
}
