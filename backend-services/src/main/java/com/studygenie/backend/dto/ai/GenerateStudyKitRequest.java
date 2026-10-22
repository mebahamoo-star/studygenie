package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record GenerateStudyKitRequest(
    @JsonProperty("course_name")
    @JsonAlias({"course_name", "courseName"})
    String courseName,

    @JsonProperty("language")
    @JsonAlias("language")
    String language,

    @JsonProperty("topics")
    @JsonAlias("topics")
    List<TopicInput> topics,

    @JsonProperty("flashcards_per_topic")
    @JsonAlias({"flashcards_per_topic", "flashcardsPerTopic", "card_count", "count"})
    int flashcardsPerTopic,

    @JsonProperty("questions_per_topic")
    @JsonAlias({"questions_per_topic", "questionsPerTopic"})
    int questionsPerTopic
) {}
