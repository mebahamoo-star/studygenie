package com.studygenie.backend.repository;

import com.studygenie.backend.entity.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
}
