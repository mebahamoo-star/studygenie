package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record ParseResponseData(
        @JsonAlias({"course_title", "courseTitle"})
        String courseTitle,
        String language,
        List<TopicItem> topics,
        List<FlashcardDto> flashcards,
        double totalEstimatedHours,
        List<String> warnings,
        String extractionMethod,
        int pages,
        int charsExtracted,
        String inputSha256,
        ResponseMeta meta
) {
    public ParseResponseData(
            String courseTitle,
            String language,
            List<TopicItem> topics,
            double totalEstimatedHours,
            List<String> warnings,
            String extractionMethod,
            int pages,
            int charsExtracted,
            String inputSha256,
            ResponseMeta meta
    ) {
        this(courseTitle, language, topics, List.of(), totalEstimatedHours, warnings, extractionMethod, pages, charsExtracted, inputSha256, meta);
    }

    public String getEffectiveCourseTitle() {
        if (courseTitle != null && !courseTitle.isBlank()) return courseTitle;
        return "Course";
    }
}
