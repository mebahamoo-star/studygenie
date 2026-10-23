package com.studygenie.backend.dto.ai;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FlashcardDto(
        String question,
        String answer,
        @JsonProperty("topicTag")
        @JsonAlias({"topic_tag", "topicTag"})
        String topicTag
) {}
