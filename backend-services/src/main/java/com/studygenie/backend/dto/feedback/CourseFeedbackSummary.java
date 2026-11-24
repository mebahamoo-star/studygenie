package com.studygenie.backend.dto.feedback;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseFeedbackSummary {
    private String courseName;
    private String dominantDifficulty; // EASY | MEDIUM | HARD
    private int totalSubmissions;
    @Builder.Default
    private List<Long> heavilyTestedTopicIds = new ArrayList<>();
    @Builder.Default
    private List<Long> hardTopicIds = new ArrayList<>();
    @Builder.Default
    private Map<String, Integer> difficultyCounts = new HashMap<>();
}
