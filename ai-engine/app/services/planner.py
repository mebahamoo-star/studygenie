import math
from datetime import timedelta

from app.errors import AppError
from app.schemas.plan import GeneratePlanRequest, PlanResponseData, PlanSummary, SkippedTopic, Task, TopicPlanInput


def _round_to_5(minutes: float) -> int:
    return int(math.ceil(minutes / 5.0)) * 5


def _scaled_review_offsets(comp_idx: int, num_days: int, mode: str) -> list[int]:
    """Scale spaced-repetition offsets to the remaining days after topic completion."""
    rem_days = (num_days - 1) - comp_idx
    if mode == "SURVIVAL":
        return [rem_days] if rem_days >= 1 else [0]
    if rem_days >= 7:
        return [1, 3, 7]
    if rem_days >= 3:
        return sorted({1, max(2, round(rem_days / 2)), rem_days})
    if rem_days == 2:
        return [1, 2]
    if rem_days == 1:
        return [1]
    return [0]


def generate_plan(req: GeneratePlanRequest) -> PlanResponseData:
    if any(isinstance(d, bool) or not isinstance(d, int) or d < 0 or d > 6 for d in req.rest_weekdays):
        raise AppError(
            status_code=422,
            error_code="INVALID_REST_DAYS",
            message="rest_weekdays must contain integers between 0 (Monday) and 6 (Sunday)",
        )

    if req.exam_date <= req.start_date:
        raise AppError(
            status_code=422,
            error_code="INVALID_DATES",
            message="exam_date must be after start_date",
        )

    if set(req.rest_weekdays) >= {0, 1, 2, 3, 4, 5, 6}:
        raise AppError(
            status_code=422,
            error_code="NO_STUDY_DAYS",
            message="No valid study days in window: all weekdays are marked as rest days.",
        )

    warnings: list[str] = []

    # Calibrate topics based on student exam feedback (tested & hard topics)
    calibrated_topics: list[TopicPlanInput] = []
    has_heavily_tested = False
    has_hard_topics = False

    for t in req.topics:
        imp = t.importance
        hrs = t.estimated_hours

        # Boost priority of topics past students reported as heavily tested on exams
        if t.is_heavily_tested:
            imp = min(5, imp + 1)
            has_heavily_tested = True

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
            )
        )

    if has_heavily_tested:
        warnings.append("Adaptive Planner: Prioritized high-yield topics heavily tested on past exams.")
    if has_hard_topics:
        warnings.append("Adaptive Planner: Allocated extra study time for topics rated hard by students.")

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
        if curr.weekday() not in req.rest_weekdays:
            study_dates.append(curr)
        curr += timedelta(days=1)

    if not study_dates and effective_buffer > 0:
        # Relax buffer days before exam while strictly preserving rest days
        curr = req.start_date
        last_possible = req.exam_date - timedelta(days=1)
        while curr <= last_possible:
            if curr.weekday() not in req.rest_weekdays:
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

    num_days = len(study_dates)
    daily_cap = _round_to_5(req.daily_hours * 60)
    total_capacity = num_days * daily_cap

    if req.mode == "SURVIVAL":
        daily_review_cap = 0
        daily_study_cap = daily_cap
    else:
        daily_review_cap = _round_to_5(daily_cap * req.review_ratio) if num_days > 1 else 0
        daily_study_cap = max(5, daily_cap - daily_review_cap)

    total_required_study_mins = sum(_round_to_5(t.estimated_hours * 60) for t in calibrated_topics)

    # Reserve final study day(s) exclusively for cumulative review when capacity allows
    if num_days >= 14 and (num_days - 2) * daily_study_cap >= total_required_study_mins:
        reserved_review_days = 2
    elif num_days >= 3 and (num_days - 1) * daily_study_cap >= total_required_study_mins:
        reserved_review_days = 1
    else:
        reserved_review_days = 0

    study_window_days = max(1, num_days - reserved_review_days)
    available_study_capacity = study_window_days * daily_study_cap

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

    # Load-balanced daily study budget across study_window_days
    total_selected_study_mins = sum(_round_to_5(t.estimated_hours * 60) for t in selected_topics)
    day_study_budget: dict[int, int] = {}
    rem_pool = total_selected_study_mins
    for d in range(study_window_days):
        days_left = study_window_days - d
        if rem_pool <= 0:
            day_study_budget[d] = 0
        else:
            ideal = _round_to_5(rem_pool / days_left)
            budget = min(daily_study_cap, max(5, min(rem_pool, ideal)))
            day_study_budget[d] = budget
            rem_pool -= budget

    # Distribute any rounding remainder up to daily_study_cap
    if rem_pool > 0:
        for d in range(study_window_days):
            if rem_pool <= 0:
                break
            extra_cap = daily_study_cap - day_study_budget[d]
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

    # Spaced-repetition & cumulative reviews (never exceeding daily_cap)
    day_review_used: dict[int, int] = {i: 0 for i in range(num_days)}
    scheduled_topic_reviews: set[tuple[int, str]] = set()
    unscheduled_review_count = 0

    def avail_on_day(d_idx: int) -> int:
        return max(0, daily_cap - day_study_used[d_idx] - day_review_used[d_idx])

    def make_review_desc(t_obj: TopicPlanInput, cumulative: bool = False) -> str:
        subtopics_str = ", ".join(t_obj.subtopics[:2]) if t_obj.subtopics else ""
        if cumulative:
            prefix = "Cumulative Review & Practice Quiz"
        elif t_obj.is_heavily_tested:
            prefix = "Active Recall (High-Yield Focus)"
        else:
            prefix = "Active Recall & Practice Quiz"
        d_txt = f"{prefix}: {t_obj.chapter_title}"
        if subtopics_str:
            d_txt += f" (Practice: {subtopics_str})"
        return d_txt

    topic_offsets = {
        t.ref: _scaled_review_offsets(topic_completion_day[t.ref], num_days, req.mode)
        for t in selected_topics
        if t.ref in topic_completion_day
    }

    review_priority_topics = sorted(
        [t for t in selected_topics if t.ref in topic_completion_day],
        key=lambda t: (t.importance, -t.order_index),
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

    # Pass 2: Additional scaled spaced-repetition intervals in NORMAL mode (with forward spillover)
    if req.mode != "SURVIVAL":
        for t in selected_topics:
            if t.ref not in topic_completion_day:
                continue
            comp_idx = topic_completion_day[t.ref]
            for offset in topic_offsets[t.ref][1:]:
                target_idx = comp_idx + offset
                if target_idx >= num_days:
                    target_idx = num_days - 1
                placed = False
                for r_idx in range(target_idx, num_days):
                    if (r_idx, t.ref) in scheduled_topic_reviews:
                        continue
                    if avail_on_day(r_idx) >= 15:
                        tasks.append(
                            Task(
                                date=study_dates[r_idx],
                                topic_ref=t.ref,
                                topic_title=t.chapter_title,
                                task_type="REVIEW",
                                minutes=15,
                                description=make_review_desc(t),
                                subtopics=t.subtopics or [],
                            )
                        )
                        day_review_used[r_idx] += 15
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
