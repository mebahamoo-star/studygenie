import math
from datetime import timedelta

from app.errors import AppError
from app.schemas.plan import GeneratePlanRequest, PlanResponseData, PlanSummary, SkippedTopic, Task, TopicPlanInput


def _round_to_5(minutes: float) -> int:
    return int(math.ceil(minutes / 5.0)) * 5


def _scaled_review_offsets(
    comp_idx: int, num_days: int, mode: str, is_weak_quiz: bool = False
) -> list[int]:
    """Scale spaced-repetition offsets to remaining days, adding reinforcement for weak-quiz topics."""
    rem_days = (num_days - 1) - comp_idx
    if mode == "SURVIVAL":
        offsets = [rem_days] if rem_days >= 1 else [0]
    elif rem_days >= 7:
        offsets = [1, 3, 7]
    elif rem_days >= 3:
        offsets = sorted({1, max(2, round(rem_days / 2)), rem_days})
    elif rem_days == 2:
        offsets = [1, 2]
    elif rem_days == 1:
        offsets = [1]
    else:
        offsets = [0]

    if is_weak_quiz and rem_days >= 2:
        for candidate in [1, 2, 3, 4, 5, 6, rem_days]:
            if candidate <= rem_days and candidate not in offsets:
                offsets = sorted([*offsets, candidate])
                break

    return offsets


def generate_plan(req: GeneratePlanRequest) -> PlanResponseData:
    if any(isinstance(d, bool) or not isinstance(d, int) or d < 0 or d > 6 for d in req.rest_weekdays):
        raise AppError(
            status_code=422,
            error_code="INVALID_REST_DAYS",
            message="rest_weekdays must contain integers between 0 (Monday) and 6 (Sunday)",
        )

    if req.weekday_hours is not None:
        for k, v in req.weekday_hours.items():
            if isinstance(k, bool) or not isinstance(k, int) or k < 0 or k > 6:
                raise AppError(
                    status_code=422,
                    error_code="INVALID_WEEKDAY_HOURS",
                    message="weekday_hours keys must be integers between 0 (Monday) and 6 (Sunday)",
                )
            if v < 0.0 or v > 12.0:
                raise AppError(
                    status_code=422,
                    error_code="INVALID_WEEKDAY_HOURS",
                    message="weekday_hours values must be between 0.0 and 12.0 hours",
                )

    if req.exam_date <= req.start_date:
        raise AppError(
            status_code=422,
            error_code="INVALID_DATES",
            message="exam_date must be after start_date",
        )

    effective_rest_weekdays = set(req.rest_weekdays)
    if req.weekday_hours is not None:
        for wk, hrs in req.weekday_hours.items():
            if hrs <= 0.0:
                effective_rest_weekdays.add(wk)

    if effective_rest_weekdays >= {0, 1, 2, 3, 4, 5, 6}:
        raise AppError(
            status_code=422,
            error_code="NO_STUDY_DAYS",
            message="No valid study days in window: all weekdays are marked as rest days.",
        )

    warnings: list[str] = []

    # Calibrate topics based on student exam feedback & quiz performance
    calibrated_topics: list[TopicPlanInput] = []
    has_heavily_tested = False
    has_hard_topics = False
    has_weak_quiz = False

    for t in req.topics:
        imp = t.importance
        hrs = t.estimated_hours
        is_weak = bool(t.is_weak_quiz or (t.quiz_score is not None and t.quiz_score < 60.0))

        # Boost priority of topics past students reported as heavily tested on exams
        if t.is_heavily_tested:
            imp = min(5, imp + 1)
            has_heavily_tested = True

        # Boost priority of topics with weak quiz performance (< 60%)
        if is_weak:
            imp = min(5, imp + 1)
            has_weak_quiz = True

        # Allocate +25% study time for topics rated hard to allow deeper practice
        if t.is_hard:
            hrs = min(60.0, max(round(hrs * 1.25, 2), round(hrs + 0.25, 2)))
            has_hard_topics = True

        calibrated_topics.append(
            TopicPlanInput(
                ref=t.ref,
                chapter_title=t.chapter_title,
                order_index=t.order_index,
                estimated_hours=hrs,
                importance=imp,
                subtopics=t.subtopics or [],
                is_heavily_tested=t.is_heavily_tested,
                is_hard=t.is_hard,
                is_weak_quiz=is_weak,
                quiz_score=t.quiz_score,
            )
        )

    if has_heavily_tested:
        warnings.append("Adaptive Planner: Prioritized high-yield topics heavily tested on past exams.")
    if has_hard_topics:
        warnings.append("Adaptive Planner: Allocated extra study time for topics rated hard by students.")
    if has_weak_quiz:
        warnings.append("Adaptive Planner: Added extra review sessions for topics with weak quiz scores (<60%).")

    if req.course_difficulty == "HARD":
        warnings.append("Adaptive Planner: Course rated HARD by students; reinforced study and review intervals.")
    elif req.course_difficulty == "EASY":
        warnings.append("Adaptive Planner: Course rated EASY by students; streamlined study schedule.")

    topic_map: dict[str, TopicPlanInput] = {t.ref: t for t in calibrated_topics}

    days_between = (req.exam_date - req.start_date).days
    if req.buffer_days_before_exam > 0:
        effective_buffer = min(req.buffer_days_before_exam, max(1, days_between - 1))
    else:
        effective_buffer = 0
    end_date = req.exam_date - timedelta(days=effective_buffer)

    study_dates = []
    curr = req.start_date
    while curr <= end_date:
        if curr.weekday() not in effective_rest_weekdays:
            study_dates.append(curr)
        curr += timedelta(days=1)

    if not study_dates and effective_buffer > 0:
        curr = req.start_date
        last_possible = req.exam_date - timedelta(days=1)
        while curr <= last_possible:
            if curr.weekday() not in effective_rest_weekdays:
                study_dates.append(curr)
            curr += timedelta(days=1)
        if study_dates:
            warnings.append("Buffer days before exam were reduced to fit available study days.")

    if not study_dates:
        raise AppError(
            status_code=422,
            error_code="NO_STUDY_DAYS",
            message="No valid study days in window given the selected rest days.",
        )

    today_remaining_cap: int | None = None
    if req.completed_today_minutes > 0 and study_dates and study_dates[0] == req.start_date:
        today_hrs = (
            req.weekday_hours.get(study_dates[0].weekday(), req.daily_hours)
            if req.weekday_hours is not None
            else req.daily_hours
        )
        base_today_cap = _round_to_5(max(0.5, today_hrs) * 60)
        rem_today_cap = max(0, ((base_today_cap - req.completed_today_minutes) // 5) * 5)
        if rem_today_cap == 0 and len(study_dates) > 1:
            study_dates = study_dates[1:]
        else:
            today_remaining_cap = rem_today_cap

    num_days = len(study_dates)
    day_cap_map: dict[int, int] = {}
    day_study_cap_map: dict[int, int] = {}
    day_review_cap_map: dict[int, int] = {}

    for i, d_obj in enumerate(study_dates):
        if i == 0 and today_remaining_cap is not None:
            d_cap = today_remaining_cap
        else:
            day_hrs = (
                req.weekday_hours.get(d_obj.weekday(), req.daily_hours)
                if req.weekday_hours is not None
                else req.daily_hours
            )
            d_cap = _round_to_5(max(0.5, day_hrs) * 60)
        day_cap_map[i] = d_cap
        if d_cap <= 0:
            day_review_cap_map[i] = 0
            day_study_cap_map[i] = 0
        elif req.mode == "SURVIVAL":
            day_review_cap_map[i] = 0
            day_study_cap_map[i] = d_cap
        else:
            r_cap = _round_to_5(d_cap * req.review_ratio) if (num_days > 1 and d_cap >= 20) else 0
            r_cap = min(d_cap, r_cap)
            day_review_cap_map[i] = r_cap
            day_study_cap_map[i] = max(0, d_cap - r_cap)

    total_capacity = sum(day_cap_map.values())
    total_required_study_mins = sum(_round_to_5(t.estimated_hours * 60) for t in calibrated_topics)

    # Reserve final study day(s) exclusively for cumulative review when capacity allows
    if num_days >= 14 and sum(day_study_cap_map[i] for i in range(num_days - 2)) >= total_required_study_mins:
        reserved_review_days = 2
    elif num_days >= 3 and sum(day_study_cap_map[i] for i in range(num_days - 1)) >= total_required_study_mins:
        reserved_review_days = 1
    else:
        reserved_review_days = 0

    study_window_days = max(1, num_days - reserved_review_days)
    available_study_capacity = sum(day_study_cap_map[i] for i in range(study_window_days))

    tasks: list[Task] = []
    skipped: list[SkippedTopic] = []
    feasible = True

    # Importance-first selection whenever capacity is insufficient or in SURVIVAL mode
    if total_required_study_mins <= available_study_capacity and req.mode != "SURVIVAL":
        selected_topics = list(calibrated_topics)
    else:
        priority_topics = sorted(
            calibrated_topics,
            key=lambda t: (t.importance, t.importance / t.estimated_hours, -t.order_index),
            reverse=True,
        )
        selected_topics = []
        used_cap = 0
        skip_reason = "NOT_ESSENTIAL" if req.mode == "SURVIVAL" else "NO_CAPACITY"
        for t in priority_topics:
            t_mins = _round_to_5(t.estimated_hours * 60)
            if used_cap + t_mins <= available_study_capacity:
                selected_topics.append(t)
                used_cap += t_mins
            else:
                skipped.append(SkippedTopic(ref=t.ref, reason=skip_reason))

        if req.mode == "SURVIVAL":
            imp5_all_selected = all((t in selected_topics) for t in calibrated_topics if t.importance == 5)
            if not imp5_all_selected:
                feasible = False
                warnings.append("Could not fit all importance-5 topics in SURVIVAL mode.")
        else:
            if skipped:
                feasible = False
                warnings.append(
                    "Some topics could not fit. Prioritized highest-importance topics; "
                    "we recommend trying SURVIVAL mode or increasing daily hours."
                )

    # Schedule selected topics in syllabus order
    selected_topics.sort(key=lambda t: t.order_index)
    planned_topics_count = len(selected_topics)

    # Load-balanced daily study budget across study_window_days weighted by per-day capacity
    total_selected_study_mins = sum(_round_to_5(t.estimated_hours * 60) for t in selected_topics)
    day_study_budget: dict[int, int] = {}
    rem_pool = total_selected_study_mins
    rem_cap_pool = sum(day_study_cap_map[d] for d in range(study_window_days))
    for d in range(study_window_days):
        d_cap = day_study_cap_map[d]
        if rem_pool <= 0 or rem_cap_pool <= 0 or d_cap <= 0:
            day_study_budget[d] = 0
        else:
            ideal = _round_to_5(rem_pool * (d_cap / rem_cap_pool))
            budget = min(d_cap, max(5, min(rem_pool, ideal)))
            day_study_budget[d] = budget
            rem_pool -= budget
            rem_cap_pool -= d_cap

    if rem_pool > 0:
        for d in range(study_window_days):
            if rem_pool <= 0:
                break
            extra_cap = day_study_cap_map[d] - day_study_budget[d]
            if extra_cap > 0:
                add = min(rem_pool, extra_cap)
                day_study_budget[d] += add
                rem_pool -= add

    day_study_used: dict[int, int] = {i: 0 for i in range(num_days)}
    topic_completion_day: dict[str, int] = {}

    day_idx = 0
    for t in selected_topics:
        rem = _round_to_5(t.estimated_hours * 60)
        subtopics_str = ", ".join(t.subtopics[:3]) if t.subtopics else ""
        desc = f"Study {t.chapter_title}"
        if t.is_heavily_tested:
            desc += " [High-Yield Exam Focus]"
        elif t.is_weak_quiz:
            desc += " [Weak Quiz Focus]"
        elif t.is_hard:
            desc += " [Challenging Concept Focus]"
        if subtopics_str:
            desc += f" (Focus: {subtopics_str})"

        last_study_day_idx = min(day_idx, study_window_days - 1)
        while rem > 0 and day_idx < study_window_days:
            avail = day_study_budget[day_idx] - day_study_used[day_idx]
            if avail <= 0:
                day_idx += 1
                continue

            take = min(rem, avail)
            tasks.append(
                Task(
                    date=study_dates[day_idx],
                    topic_ref=t.ref,
                    topic_title=t.chapter_title,
                    task_type="STUDY",
                    minutes=take,
                    description=desc,
                    subtopics=t.subtopics or [],
                )
            )
            day_study_used[day_idx] += take
            rem -= take
            last_study_day_idx = day_idx

        topic_completion_day[t.ref] = last_study_day_idx

    # Spaced-repetition & cumulative reviews (never exceeding per-day cap)
    day_review_used: dict[int, int] = {i: 0 for i in range(num_days)}
    scheduled_topic_reviews: set[tuple[int, str]] = set()
    unscheduled_review_count = 0

    def avail_on_day(d_idx: int) -> int:
        return max(0, day_cap_map[d_idx] - day_study_used[d_idx] - day_review_used[d_idx])

    def make_review_desc(t_obj: TopicPlanInput, cumulative: bool = False) -> str:
        subtopics_str = ", ".join(t_obj.subtopics[:2]) if t_obj.subtopics else ""
        if cumulative:
            prefix = "Cumulative Review & Practice Quiz"
        elif t_obj.is_weak_quiz:
            prefix = "Weak Quiz Reinforcement & Active Recall"
        elif t_obj.is_heavily_tested:
            prefix = "Active Recall (High-Yield Focus)"
        else:
            prefix = "Active Recall & Practice Quiz"
        d_txt = f"{prefix}: {t_obj.chapter_title}"
        if subtopics_str:
            d_txt += f" (Practice: {subtopics_str})"
        return d_txt

    topic_offsets = {
        t.ref: _scaled_review_offsets(
            topic_completion_day[t.ref], num_days, req.mode, is_weak_quiz=t.is_weak_quiz
        )
        for t in selected_topics
        if t.ref in topic_completion_day
    }

    review_priority_topics = sorted(
        [t for t in selected_topics if t.ref in topic_completion_day],
        key=lambda t: (1 if t.is_weak_quiz else 0, t.importance, -t.order_index),
        reverse=True,
    )

    min_review_mins = 15 if req.mode != "SURVIVAL" else 5

    # Pass 1: Guarantee at least one review per planned topic when capacity allows
    for t in review_priority_topics:
        comp_idx = topic_completion_day[t.ref]
        first_offset = topic_offsets[t.ref][0]
        target_start = min(num_days - 1, comp_idx + first_offset)

        candidate_days = list(range(target_start, num_days)) + list(range(comp_idx, target_start))
        placed = False
        for r_idx in candidate_days:
            if (r_idx, t.ref) in scheduled_topic_reviews:
                continue
            avail = avail_on_day(r_idx)
            if avail >= min_review_mins:
                take = min(15, avail)
                take = (take // 5) * 5
                if take >= min_review_mins:
                    tasks.append(
                        Task(
                            date=study_dates[r_idx],
                            topic_ref=t.ref,
                            topic_title=t.chapter_title,
                            task_type="REVIEW",
                            minutes=take,
                            description=make_review_desc(t),
                            subtopics=t.subtopics or [],
                        )
                    )
                    day_review_used[r_idx] += take
                    scheduled_topic_reviews.add((r_idx, t.ref))
                    placed = True
                    break

        if not placed:
            unscheduled_review_count += 1

    # Pass 2: Additional scaled spaced-repetition intervals (NORMAL mode, or weak-quiz topics in SURVIVAL)
    for t in review_priority_topics:
        if t.ref not in topic_completion_day:
            continue
        if req.mode == "SURVIVAL" and not t.is_weak_quiz:
            continue
        comp_idx = topic_completion_day[t.ref]
        for offset in topic_offsets[t.ref][1:]:
            target_idx = min(num_days - 1, comp_idx + offset)
            placed = False
            for r_idx in range(target_idx, num_days):
                if (r_idx, t.ref) in scheduled_topic_reviews:
                    continue
                if avail_on_day(r_idx) >= min_review_mins:
                    take = min(15, avail_on_day(r_idx))
                    take = (take // 5) * 5
                    if take >= min_review_mins:
                        tasks.append(
                            Task(
                                date=study_dates[r_idx],
                                topic_ref=t.ref,
                                topic_title=t.chapter_title,
                                task_type="REVIEW",
                                minutes=take,
                                description=make_review_desc(t),
                                subtopics=t.subtopics or [],
                            )
                        )
                        day_review_used[r_idx] += take
                        scheduled_topic_reviews.add((r_idx, t.ref))
                        placed = True
                        break
            if not placed:
                unscheduled_review_count += 1

    # Pass 3: Cumulative review on reserved final day(s)
    if reserved_review_days > 0 and selected_topics:
        final_review_days = list(range(study_window_days, num_days))
        for r_idx in final_review_days:
            for t in review_priority_topics:
                avail = avail_on_day(r_idx)
                if avail < 15:
                    break
                if (r_idx, t.ref) in scheduled_topic_reviews:
                    continue
                take = min(30, avail)
                take = (take // 5) * 5
                if take >= 15:
                    tasks.append(
                        Task(
                            date=study_dates[r_idx],
                            topic_ref=t.ref,
                            topic_title=t.chapter_title,
                            task_type="REVIEW",
                            minutes=take,
                            description=make_review_desc(t, cumulative=True),
                            subtopics=t.subtopics or [],
                        )
                    )
                    day_review_used[r_idx] += take
                    scheduled_topic_reviews.add((r_idx, t.ref))

    if unscheduled_review_count > 0:
        warnings.append(
            f"Could not schedule {unscheduled_review_count} review session(s) due to limited daily capacity."
        )

    # Sort tasks by date, then task type (STUDY before REVIEW), then syllabus order_index
    tasks.sort(
        key=lambda x: (
            x.date,
            0 if x.task_type == "STUDY" else 1,
            topic_map[x.topic_ref].order_index if x.topic_ref in topic_map else 999,
            x.topic_ref,
        )
    )

    planned_minutes = sum(t.minutes for t in tasks)

    summary = PlanSummary(
        mode=req.mode,
        study_days=num_days,
        capacity_minutes=total_capacity,
        planned_minutes=planned_minutes,
        planned_topics=planned_topics_count,
        skipped_count=len(skipped),
        feasible=feasible,
        warnings=warnings,
    )

    return PlanResponseData(tasks=tasks, skipped_topics=skipped, summary=summary)
