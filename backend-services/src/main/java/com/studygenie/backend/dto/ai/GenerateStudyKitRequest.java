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
    int questionsPerTopic,

    @JsonProperty("quiz_type")
    @JsonAlias({"quiz_type", "quizType"})
    String quizType,

    @JsonProperty("course_difficulty")
    @JsonAlias({"course_difficulty", "courseDifficulty", "difficulty"})
    String courseDifficulty,

    @JsonProperty("course_id")
    @JsonAlias({"course_id", "courseId"})
    Long courseId
) {
    public GenerateStudyKitRequest {
        if (quizType == null || quizType.isBlank()) {
            quizType = "MIXED";
        }
        if (language == null || language.isBlank()) {
            language = "auto";
        }
        if (flashcardsPerTopic <= 0) {
            flashcardsPerTopic = 10;
        }
        if (questionsPerTopic <= 0) {
            questionsPerTopic = 5;
        }
        if (topics != null) {
            topics = topics.stream()
                    .map(t -> t == null ? null : new TopicInput(
                            t.ref(),
                            t.chapterTitle(),
                            t.subtopics(),
                            t.sourceExcerpt(),
                            Boolean.TRUE.equals(t.isHeavilyTested()),
                            Boolean.TRUE.equals(t.isHard())
                    ))
                    .toList();
        }
    }

    public GenerateStudyKitRequest(String courseName, String language, List<TopicInput> topics, int flashcardsPerTopic, int questionsPerTopic) {
        this(courseName, language, topics, flashcardsPerTopic, questionsPerTopic, "MIXED", null, null);
    }

    public GenerateStudyKitRequest(String courseName, String language, List<TopicInput> topics, int flashcardsPerTopic, int questionsPerTopic, String quizType) {
        this(courseName, language, topics, flashcardsPerTopic, questionsPerTopic, quizType, null, null);
    }

    public GenerateStudyKitRequest(String courseName, String language, List<TopicInput> topics, int flashcardsPerTopic, int questionsPerTopic, String quizType, String courseDifficulty) {
        this(courseName, language, topics, flashcardsPerTopic, questionsPerTopic, quizType, courseDifficulty, null);
    }
}
