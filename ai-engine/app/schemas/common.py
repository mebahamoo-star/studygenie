from pydantic import BaseModel
from typing import Optional, Dict

class UsageMeta(BaseModel):
    prompt_tokens: int
    output_tokens: int

class ResponseMeta(BaseModel):
    model: str
    prompt_version: str
    usage: UsageMeta
    duration_ms: int
    request_id: str
