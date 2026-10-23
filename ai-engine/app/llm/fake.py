import asyncio

from pydantic import BaseModel

from app.llm.base import LLMInvalidOutput, Provider, ProviderRateLimited, ProviderTimeout


class FakeProvider(Provider):
    async def _execute(self, user: str, model: str, schema: type[BaseModel]) -> tuple[BaseModel, dict[str, int], str]:
        # Forced errors
        if "FORCE_ERROR: timeout" in user:
            raise ProviderTimeout("Forced timeout")
        if "FORCE_ERROR: rate_limit" in user:
            raise ProviderRateLimited("Forced rate limit")
        if "FORCE_ERROR: invalid" in user:
            raise LLMInvalidOutput("Forced invalid output")
            
        await asyncio.sleep(0.01) # Simulate some delay
        
        # We need to construct a valid instance of `schema`.
        # For simplicity, we just use some hardcoded dummy values matching the expected schemas.
        # It's better to detect the schema type based on its name.
        schema_name = schema.__name__
        
        if schema_name in ("CourseAnalysisResult", "ParseResult"):
            topics = []
            if "FORCE_ERROR: zero_topics" not in user:
                topics = [
                    {
                        "categoryTitle": "Introduction to AI derived from input",
                        "chapter_title": "Introduction to AI derived from input",
                        "order_index": 1,
                        "estimated_hours": 2.0,
                        "importance": 3,
                        "subtopics": [
                            {"title": "Basics", "summary": "Fundamental concepts and definitions."},
                            {"title": "History", "summary": "Evolution and key milestones in AI."}
                        ]
                    },
                    {
                        "categoryTitle": "Advanced Topics",
                        "chapter_title": "Advanced Topics",
                        "order_index": 2,
                        "estimated_hours": 4.5,
                        "importance": 5,
                        "subtopics": [
                            {"title": "Deep Learning", "summary": "Neural networks and gradient descent."},
                            {"title": "Transformers", "summary": "Self-attention and sequence modeling."}
                        ]
                    }
                ]
            data = {
                "course_title": "Fake Course",
                "courseTitle": "Fake Course",
                "language": "en",
                "topics": topics,
                "flashcards": [
                    {
                        "question": "What is AI?",
                        "answer": "Artificial Intelligence",
                        "topicTag": "Introduction to AI derived from input"
                    }
                ]
            }
        elif schema_name == "StudyKitResult":
            data = {
                "flashcards": [
                    {"front": "What is AI?", "back": "Artificial Intelligence"}
                ],
                "quiz": [
                    {
                        "type": "MCQ",
                        "question": "Which is an AI subfield?",
                        "options": ["Machine Learning", "Cooking", "Driving"],
                        "correct_option_index": 0,
                        "explanation": "ML is a subfield of AI."
                    },
                    {
                        "type": "TRUE_FALSE",
                        "question": "AI stands for Artificial Intelligence.",
                        "options": ["True", "False"],
                        "correct_option_index": 0,
                        "explanation": "Standard acronym."
                    }
                ]
            }
        else:
            data = {}

        validated = schema.model_validate(data)
        usage = {"prompt_tokens": 100, "output_tokens": 50}
        return validated, usage, model

    async def generate_json(self, system: str, user: str, model: str, temperature: float, max_output_tokens: int, schema: type[BaseModel], response_schema: dict | None = None, **kwargs) -> tuple[BaseModel, dict[str, int], str]:
        return await self._execute(user, model, schema)

    async def generate_json_from_pdf(self, system: str, user: str, pdf_bytes: bytes, model: str, temperature: float, max_output_tokens: int, schema: type[BaseModel], response_schema: dict | None = None, **kwargs) -> tuple[BaseModel, dict[str, int], str]:
        return await self._execute(user, model, schema)
