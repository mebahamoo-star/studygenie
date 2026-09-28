
from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class TopicInput(BaseModel):
    ref: str = Field(..., max_length=64)
    chapter_title: str = Field(..., max_length=255)
    subtopics: list[str] | None = Field(default=None, max_length=12)
    source_excerpt: str | None = Field(default=None, max_length=6000)

class GenerateStudyKitRequest(BaseModel):
    course_name: str = Field(..., max_length=150)
    language: str = "auto"
    topics: list[TopicInput] = Field(..., min_length=1, max_length=40)
    flashcards_per_topic: int = Field(default=8, ge=1, le=15)
    questions_per_topic: int = Field(default=5, ge=1, le=10)

class Flashcard(BaseModel):
    front: str = Field(..., max_length=300)
    back: str = Field(..., max_length=800)

class QuizQuestion(BaseModel):
    type: str
    question: str
    options: list[str]
    correct_option_index: int
    explanation: str = Field(..., max_length=500)

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
