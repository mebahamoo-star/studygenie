import math
from datetime import timedelta

from app.errors import AppError
from app.schemas.plan import GeneratePlanRequest, PlanResponseData, PlanSummary, SkippedTopic, Task, TopicPlanInput


def _round_to_5(minutes: float) -> int:
    return int(math.ceil(minutes / 5.0)) * 5

def generate_plan(req: GeneratePlanRequest) -> PlanResponseData:
    warnings: list[str] = []

    # Map topics by ref for fast metadata lookup
    topic_map: dict[str, TopicPlanInput] = {t.ref: t for t in req.topics}

    # If exam date is today or in the past, auto-adjust to 14 days ahead
    if req.exam_date <= req.start_date:
        req.exam_date = req.start_date + timedelta(days=14)
        warnings.append("Target exam date was automatically scheduled 14 days ahead.")

    days_between = (req.exam_date - req.start_date).days
    effective_buffer = min(req.buffer_days_before_exam, max(0, days_between - 1))
    end_date = req.exam_date - timedelta(days=effective_buffer)

    study_dates = []
    curr = req.start_date
    while curr <= end_date:
        if curr.weekday() not in req.rest_weekdays:
            study_dates.append(curr)
        curr += timedelta(days=1)

    if not study_dates:
        curr = req.start_date
        while curr < req.exam_date:
            study_dates.append(curr)
            curr += timedelta(days=1)
        if not study_dates:
            study_dates = [req.start_date]
        warnings.append("Study days relaxed to fit preparation window before exam.")

    daily_cap = _round_to_5(req.daily_hours * 60)
    total_capacity = len(study_dates) * daily_cap

    tasks: list[Task] = []
    skipped: list[SkippedTopic] = []

    planned_topics_count = 0
    feasible = True

    if req.mode == "SURVIVAL":
        sorted_topics = sorted(
            req.topics,
            key=lambda t: (t.importance, t.importance / t.estimated_hours, -t.order_index),
            reverse=True
        )
        
        selected_topics = []
        used_cap = 0
        for t in sorted_topics:
            t_mins = _round_to_5(t.estimated_hours * 60)
            if used_cap + t_mins <= total_capacity:
                selected_topics.append(t)
                used_cap += t_mins
            else:
                skipped.append(SkippedTopic(ref=t.ref, reason="NOT_ESSENTIAL"))
                
        # feasible if all importance 5 topics were selected
        imp5_all_selected = all((t in selected_topics) for t in req.topics if t.importance == 5)
        if not imp5_all_selected:
            feasible = False
            warnings.append("Could not fit all importance-5 topics in SURVIVAL mode.")
            
        selected_topics.sort(key=lambda t: t.order_index)
        
        day_idx = 0
        day_used = 0
        
        for t in selected_topics:
            rem = _round_to_5(t.estimated_hours * 60)
            subtopics_str = ", ".join(t.subtopics[:3]) if t.subtopics else ""
            desc = f"Study {t.chapter_title}"
            if subtopics_str:
                desc += f" (Focus: {subtopics_str})"

            while rem > 0 and day_idx < len(study_dates):
                avail = daily_cap - day_used
                if avail == 0:
                    day_idx += 1
                    day_used = 0
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
                        subtopics=t.subtopics or []
                    )
                )
                day_used += take
                rem -= take
                
        # If we have free capacity on the last day, and we studied things, we can add a REVIEW task
        if day_idx < len(study_dates) - 1 or (day_idx == len(study_dates) - 1 and day_used < daily_cap):
            last_day = study_dates[-1]
            last_day_avail = daily_cap - (day_used if day_idx == len(study_dates) - 1 else 0)
            
            review_take_per_topic = _round_to_5(last_day_avail / max(1, len(selected_topics))) if selected_topics else 0
            if review_take_per_topic > 0:
                for t in selected_topics:
                    if last_day_avail <= 0:
                        break
                    take = min(review_take_per_topic, last_day_avail)
                    subtopics_str = ", ".join(t.subtopics[:2]) if t.subtopics else ""
                    desc = f"Active Recall & Quiz: {t.chapter_title}"
                    if subtopics_str:
                        desc += f" (Practice: {subtopics_str})"

                    tasks.append(
                        Task(
                            date=last_day,
                            topic_ref=t.ref,
                            topic_title=t.chapter_title,
                            task_type="REVIEW",
                            minutes=take,
                            description=desc,
                            subtopics=t.subtopics or []
                        )
                    )
                    last_day_avail -= take

        planned_topics_count = len(selected_topics)
    else: # NORMAL
        sorted_topics = sorted(req.topics, key=lambda t: t.order_index)
        
        # Calculate daily study vs review capacity
        daily_review_cap = _round_to_5(daily_cap * req.review_ratio)
        daily_study_cap = daily_cap - daily_review_cap
        
        day_idx = 0
        day_study_used = {i: 0 for i in range(len(study_dates))}
        
        topic_completion_day: dict[str, int] = {} # ref -> day_idx
        
        for t in sorted_topics:
            rem = _round_to_5(t.estimated_hours * 60)
            
            rem_total_study_cap = sum((daily_study_cap - day_study_used[i]) for i in range(day_idx, len(study_dates)))
            if rem > rem_total_study_cap:
                skipped.append(SkippedTopic(ref=t.ref, reason="NO_CAPACITY"))
                feasible = False
                continue
                
            planned_topics_count += 1
            last_study_day_idx = day_idx

            subtopics_str = ", ".join(t.subtopics[:3]) if t.subtopics else ""
            desc = f"Study {t.chapter_title}"
            if subtopics_str:
                desc += f" (Focus: {subtopics_str})"
            
            while rem > 0 and day_idx < len(study_dates):
                avail = daily_study_cap - day_study_used[day_idx]
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
                        subtopics=t.subtopics or []
                    )
                )
                day_study_used[day_idx] += take
                rem -= take
                last_study_day_idx = day_idx
                
            topic_completion_day[t.ref] = last_study_day_idx
            
        if not feasible:
            warnings.append("Some topics could not fit. We recommend trying SURVIVAL mode.")
            
        # Schedule reviews: 1, 3, 7 days after completion
        day_review_used = {i: 0 for i in range(len(study_dates))}
        for t_ref, comp_idx in topic_completion_day.items():
            t_obj = topic_map.get(t_ref)
            title = t_obj.chapter_title if t_obj else f"Chapter {t_ref}"
            subtopics = t_obj.subtopics if t_obj else []
            subtopics_str = ", ".join(subtopics[:2]) if subtopics else ""
            desc = f"Active Recall & Practice Quiz: {title}"
            if subtopics_str:
                desc += f" (Practice: {subtopics_str})"

            for offset in [1, 3, 7]:
                r_idx = comp_idx + offset
                if r_idx < len(study_dates):
                    avail = daily_review_cap - day_review_used[r_idx]
                    if avail >= 15: # Arbitrary min 15 mins for review
                        take = 15
                        tasks.append(
                            Task(
                                date=study_dates[r_idx],
                                topic_ref=t_ref,
                                topic_title=title,
                                task_type="REVIEW",
                                minutes=take,
                                description=desc,
                                subtopics=subtopics
                            )
                        )
                        day_review_used[r_idx] += take

    # Sort tasks by date, then task type (STUDY before REVIEW), then topic_ref
    tasks.sort(key=lambda x: (x.date, 0 if x.task_type == "STUDY" else 1, x.topic_ref))
    
    planned_minutes = sum(t.minutes for t in tasks)
    
    summary = PlanSummary(
        mode=req.mode,
        study_days=len(study_dates),
        capacity_minutes=total_capacity,
        planned_minutes=planned_minutes,
        planned_topics=planned_topics_count,
        skipped_count=len(skipped),
        feasible=feasible,
        warnings=warnings
    )
    
    return PlanResponseData(tasks=tasks, skipped_topics=skipped, summary=summary)
