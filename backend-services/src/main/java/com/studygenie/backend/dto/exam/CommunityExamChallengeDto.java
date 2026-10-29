package com.studygenie.backend.dto.exam;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;

public record CommunityExamChallengeDto(
    @JsonProperty("id") Long id,
    @JsonProperty("course_id") Long courseId,
    @JsonProperty("course_name") String courseName,
    @JsonProperty("exam_type") String examType,
    @JsonProperty("exam_date") LocalDate examDate,
    @JsonProperty("professor") String professor,
    @JsonProperty("uploader_name") String uploaderName,
    @JsonProperty("university_name") String universityName,
    @JsonProperty("college_name") String collegeName,
    @JsonProperty("has_syllabus") boolean hasSyllabus,
    @JsonProperty("chapters_count") int chaptersCount,
    @JsonProperty("peer_count") int peerCount,
    @JsonProperty("is_joined") boolean isJoined
) {}
