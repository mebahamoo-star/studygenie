from datetime import date, timedelta
from typing import Any
from pydantic import BaseModel, Field, model_validator


class TopicPlanInput(BaseModel):
    ref: str
    chapter_title: str
    order_index: int = 1
    estimated_hours: float = Field(default=2.0, ge=0.5, le=60)
    importance: int = Field(default=3, ge=1, le=5)
    subtopics: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            ref = data.get("ref") or data.get("topicRef") or data.get("topic_ref") or data.get("id") or "1"
            title = data.get("chapter_title") or data.get("chapterTitle") or data.get("name") or data.get("title") or f"Chapter {ref}"
            order = data.get("order_index") or data.get("orderIndex") or 1
            try:
                order = int(order)
            except (ValueError, TypeError):
                order = 1

            hours = data.get("estimated_hours") or data.get("estimatedHours") or data.get("hours") or 2.0
            try:
                hours = float(hours)
                if hours < 0.5:
                    hours = 0.5
                elif hours > 60:
                    hours = 60.0
            except (ValueError, TypeError):
                hours = 2.0

            imp = data.get("importance") or 3
            try:
                imp = int(imp)
                if imp < 1:
                    imp = 1
                elif imp > 5:
                    imp = 5
            except (ValueError, TypeError):
                imp = 3

            raw_subtopics = data.get("subtopics") or []
            if isinstance(raw_subtopics, list):
                subtopics = [str(s) for s in raw_subtopics if s]
            else:
                subtopics = []

            return {
                "ref": str(ref),
                "chapter_title": str(title),
                "order_index": order,
                "estimated_hours": hours,
                "importance": imp,
                "subtopics": subtopics,
            }
        return data


class GeneratePlanRequest(BaseModel):
    start_date: date
    exam_date: date
    topics: list[TopicPlanInput] = Field(..., min_length=1, max_length=40)
    daily_hours: float = Field(default=2.0, ge=0.5, le=12.0)
    rest_weekdays: list[int] = Field(default_factory=list) # 0 = Monday
    mode: str = Field(default="NORMAL") # NORMAL | SURVIVAL
    buffer_days_before_exam: int = Field(default=1, ge=0, le=7)
    review_ratio: float = Field(default=0.15, ge=0.0, le=0.4)

    @model_validator(mode="before")
    @classmethod
    def normalize_plan_request(cls, data: Any) -> Any:
        if isinstance(data, dict):
            d = dict(data)
            # Normalize date aliases
            if "start_date" not in d and "startDate" in d:
                d["start_date"] = d["startDate"]
            if not d.get("start_date"):
                d["start_date"] = date.today()

            if "exam_date" not in d and "examDate" in d:
                d["exam_date"] = d["examDate"]
            if not d.get("exam_date"):
                d["exam_date"] = date.today() + timedelta(days=14)

            # Daily hours
            if "daily_hours" not in d and "dailyHours" in d:
                d["daily_hours"] = d["dailyHours"]
            try:
                dh = float(d.get("daily_hours", 2.0))
                if dh < 0.5:
                    d["daily_hours"] = 0.5
                elif dh > 12.0:
                    d["daily_hours"] = 12.0
            except (ValueError, TypeError):
                d["daily_hours"] = 2.0

            # Rest weekdays
            if "rest_weekdays" not in d:
                if "restWeekdays" in d:
                    d["rest_weekdays"] = d["restWeekdays"]
                elif "restDays" in d:
                    d["rest_weekdays"] = d["restDays"]
                elif "rest_days" in d:
                    d["rest_weekdays"] = d["rest_days"]
                else:
                    d["rest_weekdays"] = [6]
            if not isinstance(d.get("rest_weekdays"), list):
                d["rest_weekdays"] = [6]

            # Mode
            mode = d.get("mode", "NORMAL")
            d["mode"] = str(mode).upper()

            # Buffer days
            if "buffer_days_before_exam" not in d:
                b = d.get("bufferDaysBeforeExam") or d.get("bufferDays") or d.get("buffer_days") or 1
                try:
                    d["buffer_days_before_exam"] = min(7, max(0, int(b)))
                except (ValueError, TypeError):
                    d["buffer_days_before_exam"] = 1

            # Review ratio
            if "review_ratio" not in d:
                rr = d.get("reviewRatio") or d.get("review_ratio") or 0.15
                try:
                    d["review_ratio"] = min(0.4, max(0.0, float(rr)))
                except (ValueError, TypeError):
                    d["review_ratio"] = 0.15

            return d
        return data


class Task(BaseModel):
    date: date
    topic_ref: str
    topic_title: str | None = None
    task_type: str # STUDY | REVIEW
    minutes: int
    description: str | None = None
    subtopics: list[str] = Field(default_factory=list)


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
