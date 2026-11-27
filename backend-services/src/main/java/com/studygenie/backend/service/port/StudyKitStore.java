package com.studygenie.backend.service.port;

import com.studygenie.backend.dto.study.StoredStudyKit;
import java.util.List;
import java.util.Optional;

public interface StudyKitStore {
    void save(StoredStudyKit kit);

    default StoredStudyKit saveAndReturn(StoredStudyKit kit) {
        save(kit);
        return kit;
    }

    Optional<StoredStudyKit> findById(String kitId);

    default List<StoredStudyKit> findByUserId(Long userId) {
        return List.of();
    }

    default List<StoredStudyKit> findByUserIdAndCourseId(Long userId, Long courseId) {
        return List.of();
    }
}
