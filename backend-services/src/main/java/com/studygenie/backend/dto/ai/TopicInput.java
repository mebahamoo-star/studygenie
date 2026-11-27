package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record TopicInput(
    String ref,
    String chapterTitle,
    List<String> subtopics,
    String sourceExcerpt,
    @JsonProperty("is_heavily_tested")
    @JsonAlias({"is_heavily_tested", "isHeavilyTested", "heavily_tested", "heavilyTested"})
    Boolean isHeavilyTested,
    @JsonProperty("is_hard")
    @JsonAlias({"is_hard", "isHard", "hard_topic", "hardTopic"})
    Boolean isHard
) {
    public TopicInput {
        isHeavilyTested = Boolean.TRUE.equals(isHeavilyTested);
        isHard = Boolean.TRUE.equals(isHard);
        if (subtopics == null) {
            subtopics = List.of();
        }
    }

    public TopicInput(String ref, String chapterTitle, List<String> subtopics, String sourceExcerpt) {
        this(ref, chapterTitle, subtopics, sourceExcerpt, false, false);
    }
}
