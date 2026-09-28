import pytest

from app.config import settings
from app.llm.base import ProviderNotConfigured
from app.llm.factory import get_provider
from app.llm.fake import FakeProvider


def test_get_provider_fake(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "fake")
    provider = get_provider()
    assert isinstance(provider, FakeProvider)

def test_get_provider_gemini_missing_key(monkeypatch):
    monkeypatch.setattr(settings, "llm_provider", "gemini")
    monkeypatch.setattr(settings, "gemini_api_key", None)
    with pytest.raises(ProviderNotConfigured, match="GEMINI_API_KEY is not set."):
        get_provider()
