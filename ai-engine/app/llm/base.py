from typing import Protocol

from pydantic import BaseModel


class ProviderError(Exception):
    pass

class ProviderAuthError(ProviderError):
    pass

class ProviderRateLimited(ProviderError):
    pass

class ProviderTimeout(ProviderError):
    pass

class ProviderBadResponse(ProviderError):
    pass

class ProviderNotConfigured(ProviderError):
    pass

class LLMInvalidOutput(ProviderError):
    pass

class Provider(Protocol):
    async def generate_json(
        self,
        system: str,
        user: str,
        model: str,
        temperature: float,
        max_output_tokens: int,
        schema: type[BaseModel]
    ) -> tuple[BaseModel, dict[str, int], str]:
        ...

    async def generate_json_from_pdf(
        self,
        system: str,
        user: str,
        pdf_bytes: bytes,
        model: str,
        temperature: float,
        max_output_tokens: int,
        schema: type[BaseModel]
    ) -> tuple[BaseModel, dict[str, int], str]:
        ...
