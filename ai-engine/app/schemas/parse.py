from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.common import ResponseMeta


class TopicItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    order_index: int = 1
    chapter_title: str = Field(default="Topic", max_length=255)
    estimated_hours: float = Field(default=2.0)
    importance: int = Field(default=3)
    subtopics: list[str] = Field(default_factory=list)
    content_excerpt: str | None = Field(default=None)

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: dict):
        if isinstance(data, dict):
            if "chapter_title" not in data:
                title = data.get("title") or data.get("name") or data.get("chapter") or data.get("topic") or "Topic"
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
    language: str = Field(default="en")
    topics: list[TopicItem] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_result(cls, data: dict):
        if isinstance(data, dict):
            if "course_title" not in data:
                title = data.get("course_name") or data.get("title") or data.get("course")
                if title:
                    data["course_title"] = str(title)
            if "language" not in data:
                data["language"] = data.get("lang") or "en"
            if "topics" not in data:
                items = data.get("chapters") or data.get("items") or data.get("modules") or data.get("sections") or []
                data["topics"] = items
        return data


class ParseResponseData(BaseModel):
    course_title: str | None
    language: str
    topics: list[TopicItem]
    total_estimated_hours: float
    warnings: list[str]
    extraction_method: str
    pages: int
    chars_extracted: int
    input_sha256: str
    meta: ResponseMeta
