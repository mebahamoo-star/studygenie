package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopicPlanInput {
    @JsonAlias({"topicRef", "topic_ref", "id"})
    @Builder.Default
    private String ref = "1";

    @JsonAlias({"chapterTitle", "name", "title"})
    @Builder.Default
    private String chapterTitle = "Chapter 1";

    @JsonAlias("orderIndex")
    @Builder.Default
    private int orderIndex = 1;

    @JsonAlias({"estimatedHours", "hours"})
    @Builder.Default
    private double estimatedHours = 1.0;

    @Builder.Default
    private int importance = 3;

    @Builder.Default
    private List<String> subtopics = new ArrayList<>();

    public TopicPlanInput(String ref, String chapterTitle, int orderIndex, double estimatedHours, int importance) {
        this(ref, chapterTitle, orderIndex, estimatedHours, importance, new ArrayList<>());
    }

    // Record-style accessors for backward compatibility
    public String ref() {
        return ref != null && !ref.isBlank() ? ref : String.valueOf(orderIndex > 0 ? orderIndex : 1);
    }

    public String chapterTitle() {
        return chapterTitle != null && !chapterTitle.isBlank() ? chapterTitle : "Chapter " + ref();
    }

    public int orderIndex() {
        return orderIndex > 0 ? orderIndex : 1;
    }

    public double estimatedHours() {
        return estimatedHours >= 0.5 ? estimatedHours : 1.0;
    }

    public int importance() {
        return (importance >= 1 && importance <= 5) ? importance : 3;
    }

    public List<String> subtopics() {
        return subtopics != null ? subtopics : new ArrayList<>();
    }
}
