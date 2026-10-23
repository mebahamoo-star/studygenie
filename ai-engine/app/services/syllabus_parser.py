import hashlib
import time

from app.config import settings
from app.errors import AppError
from app.llm.factory import get_provider
from app.prompts.parse import (
    COURSE_ANALYSIS_SCHEMA,
    PROMPT_VERSION,
    SYSTEM_INSTRUCTION,
    USER_PROMPT_TEMPLATE,
)
from app.schemas.common import ResponseMeta, UsageMeta
from app.schemas.parse import (
    CourseAnalysisResult,
    FlashcardItem,
    ParseResponseData,
    TopicCategory,
    TopicItem,
)


async def parse_syllabus(
    file_bytes: bytes,
    course_name: str | None,
    language_hint: str,
    extracted_text: str,
    pages: int,
    extraction_method: str,
    filename: str = ""
) -> ParseResponseData:
    provider = get_provider()
    warnings = []
    input_sha256 = hashlib.sha256(file_bytes).hexdigest()

    is_pdf = extraction_method == "pdf" or file_bytes.startswith(b"%PDF-")

    start_t = time.time()

    if is_pdf:
        # Step 1: For PDFs, send directly to Gemini using inlineData / File API
        user_prompt = (
            "Analyze this course material / syllabus PDF. Extract the logical module topics with detailed "
            "subtopics (title and summary) and generate EXACTLY 10 high-yield study flashcards according to the required schema (strict limit: exactly 10 flashcards in total)."
        )
        if filename:
            user_prompt += f" Document filename is '{filename}'."
        if course_name:
            user_prompt += f" Course name is {course_name}."

        parsed_result, usage, model = await provider.generate_json_from_pdf(
            system=SYSTEM_INSTRUCTION,
            user=user_prompt,
            pdf_bytes=file_bytes,
            model=settings.llm_model_parse,
            temperature=settings.llm_temperature_parse,
            max_output_tokens=settings.llm_max_output_tokens_parse,
            schema=CourseAnalysisResult,
            response_schema=COURSE_ANALYSIS_SCHEMA,
        )
    else:
        # Step 1: For PPT/PPTX and text, clean text was extracted with python-pptx (including slide titles, bodies, and speaker notes)
        if len(extracted_text) > settings.max_input_chars:
            extracted_text = extracted_text[:settings.max_input_chars]
            warnings.append(f"Text truncated to {settings.max_input_chars} characters.")

        user_prompt = USER_PROMPT_TEMPLATE.format(document_text=extracted_text)
        if filename:
            user_prompt += f"\nHint: Document filename is '{filename}'."
        if course_name:
            user_prompt += f"\nHint: Course name is {course_name}."
        if language_hint and language_hint != "auto":
            user_prompt += f"\nHint: Expected language is {language_hint}."

        parsed_result, usage, model = await provider.generate_json(
            system=SYSTEM_INSTRUCTION,
            user=user_prompt,
            model=settings.llm_model_parse,
            temperature=settings.llm_temperature_parse,
            max_output_tokens=settings.llm_max_output_tokens_parse,
            schema=CourseAnalysisResult,
            response_schema=COURSE_ANALYSIS_SCHEMA,
        )

    duration_ms = int((time.time() - start_t) * 1000)

    # Normalization of Topics
    seen_titles = set()
    normalized_topics: list[TopicItem] = []

    # Handle CourseAnalysisResult topics
    raw_topics = getattr(parsed_result, "topics", [])
    for t in raw_topics:
        category_title = ""
        subtopics_objs = []
        if isinstance(t, TopicCategory):
            category_title = t.categoryTitle.strip()
            subtopics_objs = t.subtopics
        elif isinstance(t, dict):
            category_title = str(t.get("categoryTitle") or t.get("chapter_title") or t.get("title") or "").strip()
            subtopics_objs = t.get("subtopics") or []
        elif hasattr(t, "chapter_title"):
            category_title = getattr(t, "chapter_title", "").strip()
            subtopics_objs = getattr(t, "subtopics", [])

        if not category_title:
            continue

        category_title = category_title[:255]
        norm_key = category_title.lower()
        if norm_key in seen_titles:
            continue
        seen_titles.add(norm_key)

        sub_titles = []
        sub_summaries = []
        for s in subtopics_objs:
            if isinstance(s, dict):
                st_title = str(s.get("title") or "").strip()[:200]
                st_summary = str(s.get("summary") or "").strip()[:1000]
            elif hasattr(s, "title"):
                st_title = str(getattr(s, "title", "")).strip()[:200]
                st_summary = str(getattr(s, "summary", "")).strip()[:1000]
            else:
                st_title = str(s).strip()[:200]
                st_summary = ""

            if st_title:
                sub_titles.append(st_title)
                if st_summary:
                    sub_summaries.append(f"{st_title}: {st_summary}")
                else:
                    sub_summaries.append(st_title)

        sub_titles = sub_titles[:15]
        content_excerpt = "\n\n".join(sub_summaries)[:15000]

        given_hours = 0.0
        if isinstance(t, dict):
            given_hours = float(t.get("estimated_hours") or t.get("hours") or 0.0)
        else:
            given_hours = float(getattr(t, "estimated_hours", 0.0) or 0.0)

        if given_hours > 0:
            computed_hours = max(0.5, min(40.0, given_hours))
            computed_hours = round(computed_hours * 2) / 2
        else:
            computed_hours = max(1.0, min(25.0, float(len(sub_titles))))

        normalized_topics.append(
            TopicItem(
                order_index=0,
                chapter_title=category_title,
                category_title=category_title,
                estimated_hours=computed_hours,
                importance=4,
                subtopics=sub_titles,
                content_excerpt=content_excerpt,
            )
        )

    normalized_topics = normalized_topics[:40]

    if not normalized_topics:
        raise AppError(status_code=422, error_code="NO_TOPICS_FOUND", message="No valid topics found in syllabus or lecture materials")

    total_hours = 0.0
    for idx, t in enumerate(normalized_topics):
        t.order_index = idx + 1
        total_hours += t.estimated_hours

    # Normalization of Flashcards
    raw_flashcards = getattr(parsed_result, "flashcards", [])
    normalized_flashcards: list[FlashcardItem] = []
    for fc in raw_flashcards:
        if isinstance(fc, FlashcardItem):
            q = fc.question.strip()
            a = fc.answer.strip()
            tag = fc.topicTag.strip()
        elif isinstance(fc, dict):
            q = str(fc.get("question") or fc.get("front") or "").strip()
            a = str(fc.get("answer") or fc.get("back") or "").strip()
            tag = str(fc.get("topicTag") or fc.get("tag") or "").strip()
        else:
            q = str(getattr(fc, "question", "")).strip()
            a = str(getattr(fc, "answer", "")).strip()
            tag = str(getattr(fc, "topicTag", "")).strip()

        if q and a:
            normalized_flashcards.append(FlashcardItem(question=q, answer=a, topicTag=tag or (normalized_topics[0].chapter_title if normalized_topics else "General")))

    # STRICT ENFORCEMENT: Enforce the strict 10 flashcard limit
    normalized_flashcards = normalized_flashcards[:10]

    course_title = getattr(parsed_result, "courseTitle", None) or getattr(parsed_result, "course_title", None) or course_name or "Course"

    meta = ResponseMeta(
        model=model,
        prompt_version=PROMPT_VERSION,
        usage=UsageMeta(prompt_tokens=usage.get("prompt_tokens", 0), output_tokens=usage.get("output_tokens", 0)),
        duration_ms=duration_ms,
        request_id=""
    )

    return ParseResponseData(
        course_title=course_title,
        courseTitle=course_title,
        language="en",
        topics=normalized_topics,
        flashcards=normalized_flashcards,
        total_estimated_hours=total_hours,
        warnings=warnings,
        extraction_method=extraction_method,
        pages=pages,
        chars_extracted=len(extracted_text),
        input_sha256=input_sha256,
        meta=meta
    )
