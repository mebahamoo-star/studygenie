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
    res = generate_plan(req)
    assert any("automatically scheduled 14 days ahead" in w for w in res.summary.warnings)
    assert res.summary.study_days > 0

def test_planner_adapts_to_heavily_tested_topics():
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 1),
        exam_date=date(2023, 10, 2),
        buffer_days_before_exam=0,
        rest_weekdays=[],
        topics=[
            TopicPlanInput(ref="t1", chapter_title="Basics", order_index=1, estimated_hours=2, importance=2, is_heavily_tested=True),
            TopicPlanInput(ref="t2", chapter_title="Theory", order_index=2, estimated_hours=4, importance=2, is_heavily_tested=False),
        ],
        daily_hours=2.0, # 120 mins total capacity
        mode="SURVIVAL"
    )
    res = generate_plan(req)
    # t1 (heavily tested) is prioritized and fits
    assert res.tasks[0].topic_ref == "t1"
    assert "High-Yield Exam Focus" in res.tasks[0].description
    assert any("heavily tested" in w.lower() for w in res.summary.warnings)

def test_planner_adapts_to_hard_topics_and_course_difficulty():
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 1),
        exam_date=date(2023, 10, 10),
        buffer_days_before_exam=0,
        rest_weekdays=[],
        topics=[
            TopicPlanInput(ref="t1", chapter_title="Tricky Algorithms", order_index=1, estimated_hours=2.0, importance=4, is_hard=True),
        ],
        daily_hours=3.0,
        mode="NORMAL",
        course_difficulty="HARD"
    )
    res = generate_plan(req)
    # 2.0h * 1.25 = 2.5h (150 mins)
    study_mins = sum(t.minutes for t in res.tasks if t.task_type == "STUDY")
    assert study_mins >= 150
    assert any("hard" in w.lower() for w in res.summary.warnings)

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
