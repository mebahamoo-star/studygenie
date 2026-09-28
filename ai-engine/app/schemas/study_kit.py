from pydantic import BaseModel, Field
from typing import List, Optional
from app.schemas.common import ResponseMeta

class TopicInput(BaseModel):
    ref: str = Field(..., max_length=64)
    chapter_title: str = Field(..., max_length=255)
    subtopics: Optional[List[str]] = Field(default=None, max_length=12)
    source_excerpt: Optional[str] = Field(default=None, max_length=6000)

class GenerateStudyKitRequest(BaseModel):
    course_name: str = Field(..., max_length=150)
    language: str = "auto"
    topics: List[TopicInput] = Field(..., min_length=1, max_length=40)
    flashcards_per_topic: int = Field(default=8, ge=1, le=15)
    questions_per_topic: int = Field(default=5, ge=1, le=10)

class Flashcard(BaseModel):
    front: str = Field(..., max_length=300)
    back: str = Field(..., max_length=800)

class QuizQuestion(BaseModel):
    type: str
    question: str
    options: List[str]
    correct_option_index: int
    explanation: str = Field(..., max_length=500)

class TopicKit(BaseModel):
    ref: str
    flashcards: List[Flashcard]
    quiz: List[QuizQuestion]

class FailedTopic(BaseModel):
    ref: str
    error_code: str

class StudyKitResult(BaseModel):
    flashcards: List[Flashcard]
    quiz: List[QuizQuestion]

class StudyKitResponseData(BaseModel):
    topics: List[TopicKit]
    failed_topics: List[FailedTopic]
    meta: ResponseMeta
