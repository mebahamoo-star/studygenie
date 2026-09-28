import asyncio
import random
import time

from app.config import settings
from app.errors import AppError
from app.llm.factory import get_provider
from app.prompts.study_kit import PROMPT_VERSION, SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.schemas.common import ResponseMeta, UsageMeta
from app.schemas.study_kit import (
    FailedTopic,
    Flashcard,
    GenerateStudyKitRequest,
    QuizQuestion,
    StudyKitResponseData,
    StudyKitResult,
    TopicInput,
    TopicKit,
)


def _validate_and_normalize_kit(topic: TopicInput, result: StudyKitResult, rand: random.Random) -> TopicKit:
    valid_flashcards = []
    seen_fronts = set()
    for fc in result.flashcards:
        front = fc.front.strip()
        back = fc.back.strip()
        if not front or not back:
            continue
        if len(front) > 300 or len(back) > 800:
            continue
        if front.lower() in seen_fronts:
            continue
        seen_fronts.add(front.lower())
        valid_flashcards.append(Flashcard(front=front, back=back))

    valid_quiz = []
    seen_questions = set()
    for q in result.quiz:
        q_text = q.question.strip()
        if not q_text or q_text.lower() in seen_questions:
            continue
            
        if q.type == "MCQ":
            if not (3 <= len(q.options) <= 5):
                continue
            opts = [o.strip() for o in q.options if o.strip()]
            if len(set(opts)) != len(opts) or len(opts) != len(q.options):
                continue
            if not (0 <= q.correct_option_index < len(opts)):
                continue
        elif q.type == "TRUE_FALSE":
            if len(q.options) != 2:
                continue
            opts = [o.strip() for o in q.options if o.strip()]
            if len(set(opts)) != 2:
                continue
            if q.correct_option_index not in (0, 1):
                continue
        else:
            continue
            
        if len(q.explanation) > 500:
            continue
            
        seen_questions.add(q_text.lower())
        
        # Shuffle MCQ options safely
        if q.type == "MCQ":
            correct_opt = opts[q.correct_option_index]
            rand.shuffle(opts)
            new_correct_idx = opts.index(correct_opt)
            valid_quiz.append(QuizQuestion(
                type=q.type,
                question=q_text,
                options=opts,
                correct_option_index=new_correct_idx,
                explanation=q.explanation
            ))
        else:
            valid_quiz.append(QuizQuestion(
                type=q.type,
                question=q_text,
                options=opts,
                correct_option_index=q.correct_option_index,
                explanation=q.explanation
            ))

    if not valid_flashcards and not valid_quiz:
        raise ValueError("No valid items found after normalization")
        
    return TopicKit(ref=topic.ref, flashcards=valid_flashcards, quiz=valid_quiz)


async def _generate_topic_kit(req: GenerateStudyKitRequest, topic: TopicInput, rand: random.Random) -> tuple[TopicKit, FailedTopic, dict[str, int], str]:
    provider = get_provider()
    
    user_prompt = USER_PROMPT_TEMPLATE.format(
        course_name=req.course_name,
        chapter_title=topic.chapter_title,
        subtopics=", ".join(topic.subtopics) if topic.subtopics else "None",
        source_excerpt=topic.source_excerpt or "None",
        flashcards_per_topic=req.flashcards_per_topic,
        questions_per_topic=req.questions_per_topic
    )

    try:
        parsed_result, usage, model = await provider.generate_json(
            system=SYSTEM_PROMPT,
            user=user_prompt,
            model=settings.llm_model_study_kit,
            temperature=settings.llm_temperature_study_kit,
            max_output_tokens=settings.llm_max_output_tokens_study_kit,
            schema=StudyKitResult
        )
        
        topic_kit = _validate_and_normalize_kit(topic, parsed_result, rand)
        return topic_kit, None, usage, model
    except Exception as e:
        # Returning failure
        err_code = getattr(e, "error_code", "TOPIC_GENERATION_FAILED")
        return None, FailedTopic(ref=topic.ref, error_code=err_code), {"prompt_tokens": 0, "output_tokens": 0}, settings.llm_model_study_kit

async def generate_study_kit(req: GenerateStudyKitRequest, seed: int = None) -> StudyKitResponseData:
    start_t = time.time()
    
    rand = random.Random(seed if seed is not None else time.time())
    
    tasks = [
        _generate_topic_kit(req, topic, random.Random(rand.random()))
        for topic in req.topics
    ]
    
    results = await asyncio.gather(*tasks)
    
    topics = []
    failed_topics = []
    total_usage = {"prompt_tokens": 0, "output_tokens": 0}
    last_model = settings.llm_model_study_kit
    
    for t_kit, f_kit, usage, model in results:
        total_usage["prompt_tokens"] += usage["prompt_tokens"]
        total_usage["output_tokens"] += usage["output_tokens"]
        last_model = model
        
        if t_kit:
            topics.append(t_kit)
        if f_kit:
            failed_topics.append(f_kit)
            
    if not topics:
        raise AppError(status_code=502, error_code="ALL_TOPICS_FAILED", message="Failed to generate any valid study items")

    duration_ms = int((time.time() - start_t) * 1000)
    
    meta = ResponseMeta(
        model=last_model,
        prompt_version=PROMPT_VERSION,
        usage=UsageMeta(**total_usage),
        duration_ms=duration_ms,
        request_id=""
    )
    
    return StudyKitResponseData(topics=topics, failed_topics=failed_topics, meta=meta)
