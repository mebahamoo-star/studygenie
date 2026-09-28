import hashlib

import pytest

from app.errors import AppError
from app.services.syllabus_parser import parse_syllabus


@pytest.mark.asyncio
async def test_parse_syllabus_text_fake_provider():
    res = await parse_syllabus(
        file_bytes=b"dummy",
        course_name="Test",
        language_hint="auto",
        extracted_text="Some syllabus text",
        pages=1,
        extraction_method="text"
    )
    assert res.course_title == "Fake Course"
    assert len(res.topics) == 2
    assert res.topics[0].order_index == 1
    assert res.topics[0].estimated_hours == 2.0
    assert res.meta.usage.prompt_tokens == 100
    assert res.input_sha256 == hashlib.sha256(b"dummy").hexdigest()

@pytest.mark.asyncio
async def test_parse_syllabus_zero_topics():
    with pytest.raises(AppError) as exc:
        await parse_syllabus(
            file_bytes=b"dummy",
            course_name="Test",
            language_hint="auto",
            extracted_text="FORCE_ERROR: zero_topics",
            pages=1,
            extraction_method="text"
        )
    assert exc.value.error_code == "NO_TOPICS_FOUND"
