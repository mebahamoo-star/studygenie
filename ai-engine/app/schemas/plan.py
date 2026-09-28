from datetime import date

from pydantic import BaseModel, Field


class TopicPlanInput(BaseModel):
    ref: str
    chapter_title: str
    order_index: int
    estimated_hours: float = Field(..., ge=0.5, le=60)
    importance: int = Field(..., ge=1, le=5)

class GeneratePlanRequest(BaseModel):
    start_date: date
    exam_date: date
    topics: list[TopicPlanInput] = Field(..., min_length=1, max_length=40)
    daily_hours: float = Field(default=2.0, ge=0.5, le=12.0)
    rest_weekdays: list[int] = Field(default_factory=list) # 0 = Monday
    mode: str = Field(default="NORMAL") # NORMAL | SURVIVAL
    buffer_days_before_exam: int = Field(default=1, ge=0, le=7)
    review_ratio: float = Field(default=0.15, ge=0.0, le=0.4)

class Task(BaseModel):
    date: date
    topic_ref: str
    task_type: str # STUDY | REVIEW
    minutes: int

class SkippedTopic(BaseModel):
    ref: str
    reason: str

class PlanSummary(BaseModel):
    mode: str
    study_days: int
    capacity_minutes: int
    planned_minutes: int
    planned_topics: int
    skipped_count: int
    feasible: bool
    warnings: list[str]

class PlanResponseData(BaseModel):
    tasks: list[Task]
    skipped_topics: list[SkippedTopic]
    summary: PlanSummary
