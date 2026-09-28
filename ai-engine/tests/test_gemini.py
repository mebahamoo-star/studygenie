import httpx
import pytest
import respx
from pydantic import BaseModel

from app.llm.base import ProviderAuthError
from app.llm.gemini import GeminiProvider


class DummyModel(BaseModel):
    value: str

@pytest.fixture
def gemini():
    from app.config import settings
    settings.gemini_api_key = "test_key"
    return GeminiProvider()

@pytest.mark.asyncio
@respx.mock
async def test_gemini_success(gemini):
    respx.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent").mock(
        return_value=httpx.Response(200, json={
            "candidates": [{"content": {"parts": [{"text": '{"value": "ok"}'}]}, "finishReason": "STOP"}],
            "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 5}
        })
    )
    
    res, usage, model = await gemini.generate_json("sys", "usr", "gemini-2.5-flash", 0.1, 1000, DummyModel)
    assert res.value == "ok"
    assert usage["prompt_tokens"] == 10

@pytest.mark.asyncio
@respx.mock
async def test_gemini_auth_error(gemini):
    respx.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent").mock(
        return_value=httpx.Response(403)
    )
    
    with pytest.raises(ProviderAuthError):
        await gemini.generate_json("sys", "usr", "gemini-2.5-flash", 0.1, 1000, DummyModel)

@pytest.mark.asyncio
@respx.mock
async def test_gemini_invalid_json_repair_success(gemini):
    route = respx.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent")
    route.side_effect = [
        httpx.Response(200, json={
            "candidates": [{"content": {"parts": [{"text": '{"wrong_key": "ok"}'}]}, "finishReason": "STOP"}]
        }),
        httpx.Response(200, json={
            "candidates": [{"content": {"parts": [{"text": '{"value": "repaired"}'}]}, "finishReason": "STOP"}],
            "usageMetadata": {"promptTokenCount": 1, "candidatesTokenCount": 1}
        })
    ]
    
    res, usage, model = await gemini.generate_json("sys", "usr", "gemini-2.5-flash", 0.1, 1000, DummyModel)
    assert res.value == "repaired"
    assert route.call_count == 2
