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
    assert exc.value.status_code == 422
    assert exc.value.error_code == "INVALID_DATES"


def test_planner_exam_date_equal_start_date_rejected():
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 10),
        exam_date=date(2023, 10, 10),
        topics=[TopicPlanInput(ref="t1", chapter_title="A", order_index=1, estimated_hours=2, importance=5)]
    )
    with pytest.raises(AppError) as exc:
        generate_plan(req)
    assert exc.value.status_code == 422
    assert exc.value.error_code == "INVALID_DATES"


def test_planner_invalid_rest_weekdays_rejected():
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 1),
        exam_date=date(2023, 10, 10),
        rest_weekdays=[7],
        topics=[TopicPlanInput(ref="t1", chapter_title="A", order_index=1, estimated_hours=2, importance=5)]
    )
    with pytest.raises(AppError) as exc:
        generate_plan(req)
    assert exc.value.status_code == 422
    assert exc.value.error_code == "INVALID_REST_DAYS"


def test_planner_default_rest_day_is_friday_and_honored():
    # 2023-10-02 (Mon) to 2023-10-09 (Mon), buffer=0 -> includes Fri 2023-10-06 (weekday() == 4)
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 2),
        exam_date=date(2023, 10, 9),
        buffer_days_before_exam=0,
        topics=[TopicPlanInput(ref="t1", chapter_title="A", order_index=1, estimated_hours=6, importance=5)],
        daily_hours=2.0,
    )
    assert req.rest_weekdays == [4]
    res = generate_plan(req)
    scheduled_dates = {t.date for t in res.tasks}
    assert date(2023, 10, 6) not in scheduled_dates

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


def test_planner_12_topics_24_days_balanced_and_cumulative_review():
    topics = [
        TopicPlanInput(ref=f"t{i}", chapter_title=f"Chapter {i}", order_index=i, estimated_hours=0.75, importance=3)
        for i in range(1, 13)
    ]
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 1),
        exam_date=date(2023, 10, 25),  # 24 days ahead
        buffer_days_before_exam=1,
        rest_weekdays=[4],  # Friday
        topics=topics,
        daily_hours=2.0,  # 120 mins/day
        mode="NORMAL",
    )
    res = generate_plan(req)
    assert res.summary.feasible is True
    assert len(res.skipped_topics) == 0

    # No single day may exceed daily_hours (120 mins)
    daily_totals: dict[date, int] = {}
    daily_study_dates: set[date] = set()
    for t in res.tasks:
        daily_totals[t.date] = daily_totals.get(t.date, 0) + t.minutes
        if t.task_type == "STUDY":
            daily_study_dates.add(t.date)
    assert all(total <= 120 for total in daily_totals.values())

    # Balanced across available study days (not front-loaded into just 5 days)
    assert len(daily_study_dates) >= 10

    # Final study day is reserved exclusively for cumulative review (no STUDY tasks)
    all_dates = sorted(daily_totals.keys())
    final_day = all_dates[-1]
    assert all(t.task_type == "REVIEW" for t in res.tasks if t.date == final_day)

    # Every planned topic receives at least one REVIEW task
    reviewed_refs = {t.topic_ref for t in res.tasks if t.task_type == "REVIEW"}
    assert reviewed_refs == {f"t{i}" for i in range(1, 13)}


@pytest.mark.parametrize(
    "mode,buffer_days,rest_days,review_ratio",
    [
        ("NORMAL", 1, [4], 0.2),
        ("SURVIVAL", 4, [4, 5], 0.2),
    ],
)
def test_planner_20_topics_14_days_last_3_importance_5_prioritized(
    mode: str, buffer_days: int, rest_days: list[int], review_ratio: float
):
    topics = [
        TopicPlanInput(
            ref=f"t{i}",
            chapter_title=f"Chapter {i}",
            order_index=i,
            estimated_hours=1.0,
            importance=5 if i >= 18 else 2,
        )
        for i in range(1, 21)
    ]
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 1),
        exam_date=date(2023, 10, 15),  # 14 days ahead
        buffer_days_before_exam=buffer_days,
        rest_weekdays=rest_days,
        review_ratio=review_ratio,
        topics=topics,
        daily_hours=2.0,
        mode=mode,
    )
    res = generate_plan(req)

    # All 3 importance-5 topics (last 3 in syllabus) must be selected and scheduled
    study_tasks = [t for t in res.tasks if t.task_type == "STUDY"]
    scheduled_refs = {t.topic_ref for t in study_tasks}
    assert {"t18", "t19", "t20"}.issubset(scheduled_refs)

    # Selected topics must be scheduled in ascending syllabus order
    seen_order = []
    for t in study_tasks:
        order_num = int(t.topic_ref[1:])
        if not seen_order or seen_order[-1] != order_num:
            seen_order.append(order_num)
    assert seen_order == sorted(seen_order)

    # Overflow lower-importance topics are reported in skipped_topics
    assert len(res.skipped_topics) > 0
    skipped_refs = {s.ref for s in res.skipped_topics}
    assert skipped_refs.isdisjoint({"t18", "t19", "t20"})


def test_planner_exam_tomorrow():
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 1),
        exam_date=date(2023, 10, 2),  # Exam tomorrow
        buffer_days_before_exam=2,
        rest_weekdays=[],
        topics=[
            TopicPlanInput(ref="t1", chapter_title="Low Priority", order_index=1, estimated_hours=2.0, importance=1),
            TopicPlanInput(ref="t2", chapter_title="Must Know", order_index=2, estimated_hours=1.5, importance=5),
        ],
        daily_hours=2.0,
        mode="NORMAL",
    )
    res = generate_plan(req)
    assert res.summary.study_days == 1
    assert sum(t.minutes for t in res.tasks) <= 120
    study_refs = {t.topic_ref for t in res.tasks if t.task_type == "STUDY"}
    assert "t2" in study_refs
    assert any(s.ref == "t1" for s in res.skipped_topics)


def test_planner_all_weekdays_rest_days_rejected():
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 1),
        exam_date=date(2023, 10, 10),
        rest_weekdays=[0, 1, 2, 3, 4, 5, 6],
        topics=[TopicPlanInput(ref="t1", chapter_title="A", order_index=1, estimated_hours=1.0, importance=3)],
        daily_hours=2.0,
    )
    with pytest.raises(AppError) as exc:
        generate_plan(req)
    assert exc.value.status_code == 422
    assert exc.value.error_code == "NO_STUDY_DAYS"


def test_planner_review_spillover_and_warning_when_full():
    # Tight 2-day window: 75m/day (150m total) with 4*25m=100m study -> max 15m review per day (2 of 4 fit)
    topics = [
        TopicPlanInput(ref=f"t{i}", chapter_title=f"Topic {i}", order_index=i, estimated_hours=0.4, importance=4)
        for i in range(1, 5)
    ]
    req = GeneratePlanRequest(
        start_date=date(2023, 10, 1),
        exam_date=date(2023, 10, 2),  # 2 days (Oct 1, Oct 2) with buffer=0
        buffer_days_before_exam=0,
        rest_weekdays=[],
        topics=topics,
        daily_hours=1.25,  # 75 mins/day
        review_ratio=0.15,
        mode="NORMAL",
    )
    res = generate_plan(req)
    assert all(sum(t.minutes for t in res.tasks if t.date == d) <= 75 for d in {t.date for t in res.tasks})
    review_tasks = [t for t in res.tasks if t.task_type == "REVIEW"]
    assert len(review_tasks) == 2
    assert any("could not schedule" in w.lower() for w in res.summary.warnings)
