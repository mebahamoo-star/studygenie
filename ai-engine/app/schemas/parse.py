from pydantic import BaseModel, Field
from typing import List, Optional
from app.schemas.common import ResponseMeta

class TopicItem(BaseModel):
    order_index: int
    chapter_title: str = Field(..., max_length=255)
    estimated_hours: float
    importance: int
    subtopics: List[str] = Field(default_factory=list)

class ParseResult(BaseModel):
    course_title: Optional[str] = None
    language: str
    topics: List[TopicItem]

class ParseResponseData(BaseModel):
    course_title: Optional[str]
    language: str
    topics: List[TopicItem]
    total_estimated_hours: float
    warnings: List[str]
    extraction_method: str
    pages: int
    chars_extracted: int
    input_sha256: str
    meta: ResponseMeta
