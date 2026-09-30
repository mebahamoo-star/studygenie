package com.studygenie.backend.dto.browse;

import com.studygenie.backend.entity.enums.CourseStatus;

public record CourseDto(Long id, String name, Long collegeId, CourseStatus status) {}
