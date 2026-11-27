package com.studygenie.backend.repository;

import com.studygenie.backend.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
    List<QuizQuestion> findByTopicId(Long topicId);
    List<QuizQuestion> findByKitIdOrderByIdAsc(String kitId);
    Optional<QuizQuestion> findFirstByKitIdAndExternalId(String kitId, String externalId);
}
