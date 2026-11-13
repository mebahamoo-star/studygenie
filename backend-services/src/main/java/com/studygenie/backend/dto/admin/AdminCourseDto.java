package com.studygenie.backend.dto.admin;

import com.studygenie.backend.dto.syllabus.TopicDto;

import java.time.LocalDateTime;
import java.util.List;

public record AdminCourseDto(
        Long id,
        String name,
        Long collegeId,
        String collegeName,
        Long universityId,
        String universityName,
        String status,
        boolean verified,
        boolean locked,
        LocalDateTime deletedAt,
        long enrollmentCount,
        int topicCount,
        long openReportCount,
        LocalDateTime createdAt,
        List<TopicDto> topics
) {
}
