from app.config import settings
from app.llm.base import Provider


def get_provider() -> Provider:
    if settings.llm_provider.lower() == "gemini":
        from app.llm.gemini import GeminiProvider
        return GeminiProvider()
    else:
        from app.llm.fake import FakeProvider
        return FakeProvider()
