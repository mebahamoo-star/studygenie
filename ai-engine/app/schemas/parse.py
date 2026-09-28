
from pydantic import BaseModel, Field

from app.schemas.common import ResponseMeta


class TopicItem(BaseModel):
    order_index: int
    chapter_title: str = Field(..., max_length=255)
    estimated_hours: float
    importance: int
    subtopics: list[str] = Field(default_factory=list)

class ParseResult(BaseModel):
    course_title: str | None = None
    language: str
    topics: list[TopicItem]

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
