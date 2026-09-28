from datetime import date

import pytest

from app.errors import AppError
from app.schemas.plan import GeneratePlanRequest, TopicPlanInput
from app.services.planner import generate_plan


def test_planner_invalid_dates():
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 10),
        exam_date=date(2023, 10, 5),
        topics=[TopicPlanInput(ref="t1", chapter_title="A", order_index=1, estimated_hours=2, importance=5)]
    )
    with pytest.raises(AppError) as exc:
        generate_plan(req)
    assert exc.value.error_code == "INVALID_DATES"

def test_planner_normal_mode():
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 1),
        exam_date=date(2023, 10, 5), # 4 days study
        buffer_days_before_exam=0,
        rest_weekdays=[],
        topics=[
            TopicPlanInput(ref="t1", chapter_title="A", order_index=1, estimated_hours=2, importance=5),
            TopicPlanInput(ref="t2", chapter_title="B", order_index=2, estimated_hours=3, importance=4)
        ],
        daily_hours=2.0, # 120 mins per day. Total 480.
        review_ratio=0.15 # 18 mins review, 102 mins study per day (rounded to 5 -> 20 rev, 100 study)
    )
    res = generate_plan(req)
    assert res.summary.feasible is True
    assert len(res.skipped_topics) == 0
    
    # 2 hours (120 min) t1 -> day 1 (100 min) + day 2 (20 min)
    study_tasks = [t for t in res.tasks if t.task_type == "STUDY"]
    assert len(study_tasks) > 0

def test_planner_survival_mode():
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 1),
        exam_date=date(2023, 10, 2), # 2 days, 0 buffer
        buffer_days_before_exam=0,
        rest_weekdays=[],
        topics=[
            TopicPlanInput(ref="t1", chapter_title="A", order_index=1, estimated_hours=4, importance=1),
            TopicPlanInput(ref="t2", chapter_title="B", order_index=2, estimated_hours=2, importance=5)
        ],
        daily_hours=2.0, # 120 * 2 = 240 mins total
        mode="SURVIVAL"
    )
    res = generate_plan(req)
    assert res.summary.feasible is True
    assert len(res.skipped_topics) == 1
    assert res.skipped_topics[0].ref == "t1" # less importance
    
    # Check tasks: t2 takes 2 hours (120 mins), fits in day 1
    assert res.tasks[0].topic_ref == "t2"
