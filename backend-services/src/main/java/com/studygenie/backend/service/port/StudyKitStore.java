package com.studygenie.backend.service.port;

import com.studygenie.backend.dto.study.StoredStudyKit;
import java.util.Optional;

public interface StudyKitStore {
    void save(StoredStudyKit kit);
    Optional<StoredStudyKit> findById(String kitId);
}
