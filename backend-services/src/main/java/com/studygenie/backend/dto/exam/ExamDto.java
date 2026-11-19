package com.studygenie.backend.dto.exam;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;

public record ExamDto(
    @JsonProperty("id") Long id,
    @JsonProperty("course") String course,
    @JsonProperty("type") String type,
    @JsonProperty("date") LocalDate date,
    @JsonProperty("professor") String professor,
    @JsonProperty("uploader_name") String uploaderName,
    @JsonProperty("student_id") Long studentId,
    @JsonProperty("course_id") Long courseId
) {
    public ExamDto(Long id, String course, String type, LocalDate date, String professor) {
        this(id, course, type, date, professor, null, null, null);
    }
}
