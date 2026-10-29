from typing import Any
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.common import ResponseMeta


class SubtopicItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    title: str = Field(description="Subtopic title")
    summary: str = Field(description="Detailed explanation of the concept, definitions, or formulas.")


class TopicCategory(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    categoryTitle: str = Field(description="Category or module title")
    subtopics: list[SubtopicItem] = Field(default_factory=list)


class FlashcardItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    question: str = Field(description="Flashcard question testing definitions, comparisons, formulas, or applications")
    answer: str = Field(description="Flashcard concise high-yield answer")
    topicTag: str = Field(description="Category or topic tag")


class CourseAnalysisResult(BaseModel):
    """Exact model mapping to the structured responseSchema."""
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    courseTitle: str = Field(default="Course", description="The inferred title of the course or lecture.")
    topics: list[TopicCategory] = Field(default_factory=list)
    flashcards: list[FlashcardItem] = Field(default_factory=list)


class TopicItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    order_index: int = 1
    chapter_title: str = Field(default="Topic", max_length=255)
    category_title: str | None = Field(default=None, alias="categoryTitle")
    estimated_hours: float = Field(default=2.0)
    importance: int = Field(default=3)
    subtopics: list[Any] = Field(default_factory=list)
    content_excerpt: str | None = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: dict):
        if isinstance(data, dict):
            if "category_title" not in data and "categoryTitle" in data:
                data["category_title"] = data["categoryTitle"]
            if "chapter_title" not in data:
                title = data.get("categoryTitle") or data.get("category_title") or data.get("title") or data.get("name") or data.get("chapter") or data.get("topic") or "Topic"
                data["chapter_title"] = str(title)
            if "estimated_hours" not in data:
                hours = data.get("hours") or data.get("duration") or 2.0
                try:
                    data["estimated_hours"] = float(hours)
                except (ValueError, TypeError):
                    data["estimated_hours"] = 2.0
            if "order_index" not in data:
                idx = data.get("index") or data.get("order") or 1
                try:
                    data["order_index"] = int(idx)
                except (ValueError, TypeError):
                    data["order_index"] = 1
            if "content_excerpt" not in data:
                excerpt = data.get("excerpt") or data.get("summary") or data.get("content") or data.get("overview")
                if excerpt:
                    data["content_excerpt"] = str(excerpt)
        return data


class ParseResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    course_title: str | None = Field(default=None)
    courseTitle: str | None = Field(default=None)
    language: str = Field(default="en")
    topics: list[TopicItem] = Field(default_factory=list)
    flashcards: list[FlashcardItem] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_result(cls, data: dict):
        if isinstance(data, dict):
            if "course_title" not in data:
                title = data.get("courseTitle") or data.get("course_name") or data.get("title") or data.get("course")
                if title:
                    data["course_title"] = str(title)
            if "courseTitle" not in data and "course_title" in data:
                data["courseTitle"] = data["course_title"]
            if "language" not in data:
                data["language"] = data.get("lang") or "en"
            if "topics" not in data:
                items = data.get("chapters") or data.get("items") or data.get("modules") or data.get("sections") or []
                data["topics"] = items
            if "flashcards" not in data:
                data["flashcards"] = data.get("cards") or []
        return data


class ParseResponseData(BaseModel):
    course_title: str | None = None
    courseTitle: str | None = None
    language: str = "en"
    topics: list[TopicItem] = Field(default_factory=list)
    flashcards: list[FlashcardItem] = Field(default_factory=list)
    total_estimated_hours: float = 0.0
    warnings: list[str] = Field(default_factory=list)
    extraction_method: str = "text"
    pages: int = 1
    chars_extracted: int = 0
    input_sha256: str = ""
    meta: ResponseMeta

    @model_validator(mode="before")
    @classmethod
    def sync_titles(cls, data: dict):
        if isinstance(data, dict):
            if "courseTitle" not in data and "course_title" in data:
                data["courseTitle"] = data["course_title"]
            elif "course_title" not in data and "courseTitle" in data:
                data["course_title"] = data["courseTitle"]
        return data
