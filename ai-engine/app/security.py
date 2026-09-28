import hmac
from fastapi import Header, HTTPException
from app.config import settings
from app.errors import AppError


def verify_internal_token(x_internal_token: str = Header(..., alias="X-Internal-Token")) -> str:
    """Verifies the internal auth token using constant-time comparison."""
    if not x_internal_token:
        raise AppError(status_code=401, error_code="UNAUTHORIZED", message="Missing internal token")

    expected = settings.ai_internal_token.encode("utf-8")
    actual = x_internal_token.encode("utf-8")
    
    if len(expected) != len(actual) or not hmac.compare_digest(expected, actual):
        raise AppError(status_code=401, error_code="UNAUTHORIZED", message="Invalid internal token")
        
    return x_internal_token
