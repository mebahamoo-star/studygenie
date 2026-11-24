package com.studygenie.backend.dto.feedback;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamFeedbackPayload {
    private String difficulty; // EASY | MEDIUM | HARD

    @JsonProperty("hardTopicIds")
    @JsonAlias({"hard_topic_ids", "hardTopicIds"})
    @Builder.Default
    private List<Long> hardTopicIds = new ArrayList<>();

    @JsonProperty("testedTopicIds")
    @JsonAlias({"tested_topic_ids", "testedTopicIds"})
    @Builder.Default
    private List<Long> testedTopicIds = new ArrayList<>();
}
