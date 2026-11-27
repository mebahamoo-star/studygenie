from typing import Any
from pydantic import BaseModel, Field, model_validator

from app.schemas.common import ResponseMeta


class TopicInput(BaseModel):
    ref: str = Field(..., max_length=64)
    chapter_title: str = Field(..., max_length=255)
    subtopics: list[str] | None = Field(default=None, max_length=20)
    source_excerpt: str | None = Field(default=None, max_length=20000)
    is_heavily_tested: bool = False
    is_hard: bool = False

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            raw_heavily_tested = (
                data.get("is_heavily_tested")
                if "is_heavily_tested" in data
                else (
                    data.get("isHeavilyTested")
                    if "isHeavilyTested" in data
                    else (
                        data.get("heavily_tested")
                        if "heavily_tested" in data
                        else data.get("heavilyTested")
                    )
                )
            )
            raw_hard = (
                data.get("is_hard")
                if "is_hard" in data
                else (
                    data.get("isHard")
                    if "isHard" in data
                    else (
                        data.get("hard_topic")
                        if "hard_topic" in data
                        else data.get("hardTopic")
                    )
                )
            )
            data["is_heavily_tested"] = bool(raw_heavily_tested) if raw_heavily_tested is not None else False
            data["is_hard"] = bool(raw_hard) if raw_hard is not None else False

            raw_subtopics = data.get("subtopics")
            if raw_subtopics is not None and not isinstance(raw_subtopics, list):
                data["subtopics"] = [str(raw_subtopics)]
        return data


class GenerateStudyKitRequest(BaseModel):
    course_name: str = Field(..., max_length=150)
    language: str = "auto"
    topics: list[TopicInput] = Field(..., min_length=1, max_length=40)
    flashcards_per_topic: int = Field(default=10, ge=1, le=25)
    questions_per_topic: int = Field(default=5, ge=1, le=15)
    quiz_type: str = Field(default="MIXED", max_length=30)
    course_difficulty: str | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            quiz_type = data.get("quiz_type") if "quiz_type" in data else data.get("quizType")
            if quiz_type is None or not str(quiz_type).strip():
                data["quiz_type"] = "MIXED"
            else:
                data["quiz_type"] = str(quiz_type).strip().upper()

            lang = data.get("language")
            if lang is None or not str(lang).strip():
                data["language"] = "auto"

            flashcards_per_topic = (
                data.get("flashcards_per_topic")
                if "flashcards_per_topic" in data
                else data.get("flashcardsPerTopic")
            )
            if flashcards_per_topic is None:
                data["flashcards_per_topic"] = 10

            questions_per_topic = (
                data.get("questions_per_topic")
                if "questions_per_topic" in data
                else data.get("questionsPerTopic")
            )
            if questions_per_topic is None:
                data["questions_per_topic"] = 5
        return data

class Flashcard(BaseModel):
    front: str = Field(..., max_length=500)
    back: str = Field(..., max_length=1500)

class QuizQuestion(BaseModel):
    type: str
    question: str
    options: list[str] = Field(default_factory=list)
    correct_option_index: int = 0
    correct_answer_text: str | None = None
    explanation: str = Field(..., max_length=1000)

class TopicKit(BaseModel):
    ref: str
    flashcards: list[Flashcard]
    quiz: list[QuizQuestion]

class FailedTopic(BaseModel):
    ref: str
    error_code: str

class StudyKitResult(BaseModel):
    flashcards: list[Flashcard]
    quiz: list[QuizQuestion]

class StudyKitResponseData(BaseModel):
    topics: list[TopicKit]
    failed_topics: list[FailedTopic]
    meta: ResponseMeta
