import os

import pytest

from app.config import settings

os.environ["LLM_PROVIDER"] = "fake"
os.environ["AI_INTERNAL_TOKEN"] = "test-token-for-pytest-only-0000000000"
settings.llm_provider = "fake"
settings.ai_internal_token = "test-token-for-pytest-only-0000000000"

@pytest.fixture(autouse=True, scope="session")
def force_fake_provider():
    settings.llm_provider = "fake"
    settings.ai_internal_token = "test-token-for-pytest-only-0000000000"
