package com.studygenie.backend.dto.study;

import java.util.List;

public record ClientStudyKitResponse(
        String kitId,
        Long courseId,
        String courseName,
        String language,
        List<ClientTopicKit> topics
) {
    public ClientStudyKitResponse(String kitId, List<ClientTopicKit> topics) {
        this(kitId, null, null, "en", topics);
    }

    public static ClientStudyKitResponse fromStored(StoredStudyKit stored) {
        return new ClientStudyKitResponse(
                stored.kitId(),
                stored.courseId(),
                stored.courseName(),
                stored.language(),
                stored.topics().stream().map(ClientTopicKit::fromStored).toList()
        );
    }
}
