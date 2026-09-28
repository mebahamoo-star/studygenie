package com.studygenie.backend.dto.ai;
import java.util.List;
public record TopicKit(String ref, List<Flashcard> flashcards, List<QuizQuestion> quiz) {}
