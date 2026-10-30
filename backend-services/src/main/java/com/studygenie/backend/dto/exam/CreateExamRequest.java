package com.studygenie.backend.dto.exam;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record CreateExamRequest(
    @NotBlank(message = "Course is required")
    String course,

    @NotBlank(message = "Exam type is required")
    String type,

    @NotNull(message = "Exam date is required")
    LocalDate date,

    String professor,

    @JsonProperty("uploader_name")
    String uploaderName,

    @JsonProperty("student_email")
    String studentEmail,

    @JsonProperty("course_id")
    Long courseId
) {
    public CreateExamRequest(String course, String type, LocalDate date, String professor) {
        this(course, type, date, professor, null, null, null);
    }
}
