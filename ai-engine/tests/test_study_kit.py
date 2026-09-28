import pytest

from app.errors import AppError
from app.schemas.study_kit import GenerateStudyKitRequest, TopicInput
from app.services.study_kit_generator import generate_study_kit


@pytest.mark.asyncio
async def test_generate_study_kit():
    req = GenerateStudyKitRequest(
        course_name="Course",
        topics=[
            TopicInput(ref="ref1", chapter_title="A")
        ]
    )
    res = await generate_study_kit(req, seed=42)
    assert len(res.topics) == 1
    assert res.topics[0].ref == "ref1"
    assert len(res.topics[0].flashcards) == 1
    assert len(res.topics[0].quiz) == 2
    assert len(res.failed_topics) == 0

@pytest.mark.asyncio
async def test_generate_study_kit_all_fail():
    req = GenerateStudyKitRequest(
        course_name="Course",
        topics=[
            TopicInput(ref="ref1", chapter_title="FORCE_ERROR: invalid")
        ]
    )
    with pytest.raises(AppError) as exc:
        await generate_study_kit(req, seed=42)
    assert exc.value.error_code == "ALL_TOPICS_FAILED"
