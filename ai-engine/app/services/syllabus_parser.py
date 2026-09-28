import hashlib
from typing import List, Dict, Any, Optional
from app.config import settings
from app.llm.factory import get_provider
from app.prompts.parse import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, PROMPT_VERSION
from app.schemas.parse import ParseResult, TopicItem, ParseResponseData
from app.schemas.common import ResponseMeta, UsageMeta
from app.errors import AppError


async def parse_syllabus(file_bytes: bytes, course_name: Optional[str], language_hint: str, extracted_text: str, pages: int, extraction_method: str) -> ParseResponseData:
    provider = get_provider()
    
    warnings = []
    
    input_sha256 = hashlib.sha256(file_bytes).hexdigest()
    
    if extraction_method == "text":
        if len(extracted_text) > settings.max_input_chars:
            extracted_text = extracted_text[:settings.max_input_chars]
            warnings.append(f"Text truncated to {settings.max_input_chars} characters.")
        
        user_prompt = USER_PROMPT_TEMPLATE.format(document_text=extracted_text)
        
        if course_name:
            user_prompt += f"\nHint: Course name is {course_name}"
        if language_hint and language_hint != "auto":
            user_prompt += f"\nHint: Expected language is {language_hint}"
            
        import time
        start_t = time.time()
        
        parsed_result, usage, model = await provider.generate_json(
            system=SYSTEM_PROMPT,
            user=user_prompt,
            model=settings.llm_model_parse,
            temperature=settings.llm_temperature_parse,
            max_output_tokens=settings.llm_max_output_tokens_parse,
            schema=ParseResult
        )
        
    else:
        user_prompt = "Extract topics from this syllabus PDF."
        if course_name:
            user_prompt += f" Course name is {course_name}."
            
        import time
        start_t = time.time()
        
        parsed_result, usage, model = await provider.generate_json_from_pdf(
            system=SYSTEM_PROMPT,
            user=user_prompt,
            pdf_bytes=file_bytes,
            model=settings.llm_model_parse,
            temperature=settings.llm_temperature_parse,
            max_output_tokens=settings.llm_max_output_tokens_parse,
            schema=ParseResult
        )
        
    duration_ms = int((time.time() - start_t) * 1000)

    # Normalization
    seen_titles = set()
    normalized_topics = []
    
    for t in parsed_result.topics:
        title = t.chapter_title.strip()
        if not title:
            continue
            
        title = title[:255]
        
        title_lower = title.lower()
        if title_lower in seen_titles:
            continue
        seen_titles.add(title_lower)
        
        # Clamp hours 0.5 - 40 and round to 0.5
        hours = max(0.5, min(40.0, float(t.estimated_hours)))
        hours = round(hours * 2) / 2
        
        importance = max(1, min(5, int(t.importance)))
        
        subs = []
        for s in (t.subtopics or []):
            s_str = str(s).strip()[:200]
            if s_str:
                subs.append(s_str)
        subs = subs[:12]
        
        normalized_topics.append(TopicItem(
            order_index=0, # will set later
            chapter_title=title,
            estimated_hours=hours,
            importance=importance,
            subtopics=subs
        ))
        
    normalized_topics = normalized_topics[:40]
    
    if not normalized_topics:
        raise AppError(status_code=422, error_code="NO_TOPICS_FOUND", message="No valid topics found in syllabus")
        
    total_hours = 0.0
    for idx, t in enumerate(normalized_topics):
        t.order_index = idx + 1
        total_hours += t.estimated_hours
        
    meta = ResponseMeta(
        model=model,
        prompt_version=PROMPT_VERSION,
        usage=UsageMeta(prompt_tokens=usage["prompt_tokens"], output_tokens=usage["output_tokens"]),
        duration_ms=duration_ms,
        request_id="" # Filled by router
    )
    
    return ParseResponseData(
        course_title=parsed_result.course_title,
        language=parsed_result.language,
        topics=normalized_topics,
        total_estimated_hours=total_hours,
        warnings=warnings,
        extraction_method=extraction_method,
        pages=pages,
        chars_extracted=len(extracted_text),
        input_sha256=input_sha256,
        meta=meta
    )
