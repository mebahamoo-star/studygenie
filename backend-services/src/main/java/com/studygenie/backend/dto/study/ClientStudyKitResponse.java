package com.studygenie.backend.dto.study;

import java.util.List;

public record ClientStudyKitResponse(
        String kitId,
        List<ClientTopicKit> topics
) {
    public static ClientStudyKitResponse fromStored(StoredStudyKit stored) {
        return new ClientStudyKitResponse(
                stored.kitId(),
                stored.topics().stream().map(ClientTopicKit::fromStored).toList()
        );
    }
}
