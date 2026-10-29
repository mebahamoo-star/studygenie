package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TopicItem(
        int orderIndex,
        @JsonAlias({"chapter_title", "chapterTitle", "title"})
        String chapterTitle,
        @JsonAlias({"category_title", "categoryTitle"})
        String categoryTitle,
        double estimatedHours,
        int importance,
        List<Object> subtopics,
        String contentExcerpt
) {
    public String getEffectiveTitle() {
        if (categoryTitle != null && !categoryTitle.isBlank()) return categoryTitle.trim();
        if (chapterTitle != null && !chapterTitle.isBlank()) return chapterTitle.trim();
        return "Topic " + orderIndex;
    }
}
