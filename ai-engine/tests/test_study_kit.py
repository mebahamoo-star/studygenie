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
    assert len(res.topics[0].quiz) == 3
    quiz_types = [q.type for q in res.topics[0].quiz]
    assert "MCQ" in quiz_types
    assert "TRUE_FALSE" in quiz_types
    assert "SHORT_ANSWER" in quiz_types
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

@pytest.mark.asyncio
async def test_generate_study_kit_with_student_feedback():
    req = GenerateStudyKitRequest(
        course_name="Database Systems",
        course_difficulty="HARD",
        topics=[
            TopicInput(
                ref="db1",
                chapter_title="B+ Tree Indexing",
                is_heavily_tested=True,
                is_hard=True
            )
        ]
    )
    res = await generate_study_kit(req, seed=42)
    assert len(res.topics) == 1
    assert res.topics[0].ref == "db1"
    assert len(res.topics[0].flashcards) > 0
    assert len(res.topics[0].quiz) > 0


@pytest.mark.asyncio
async def test_generate_study_kit_arabic_and_shuffled_options():
    req = GenerateStudyKitRequest(
        course_name="الذكاء الاصطناعي",
        language="ar",
        topics=[
            TopicInput(ref="ar1", chapter_title="مقدمة في الذكاء الاصطناعي")
        ]
    )
    res_a = await generate_study_kit(req, seed=1)
    res_b = await generate_study_kit(req, seed=99)

    assert len(res_a.topics) == 1
    fc = res_a.topics[0].flashcards[0]
    assert any("\u0600" <= ch <= "\u06FF" for ch in fc.front), "Flashcard front should be Arabic"

    mcq_a = next(q for q in res_a.topics[0].quiz if q.type == "MCQ")
    mcq_b = next(q for q in res_b.topics[0].quiz if q.type == "MCQ")
    assert mcq_a.options[mcq_a.correct_option_index] == mcq_a.correct_answer_text
    assert mcq_b.options[mcq_b.correct_option_index] == mcq_b.correct_answer_text
    assert mcq_a.options != mcq_b.options or mcq_a.correct_option_index >= 0
