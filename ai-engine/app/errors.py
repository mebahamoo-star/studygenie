from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError


class AppError(Exception):
    def __init__(self, status_code: int, error_code: str, message: str, details: list[dict[str, str]] | None = None):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.details = details or []


def make_envelope(
    success: bool,
    message: str | None = None,
    data: Any = None,
    errors: list[dict[str, str]] | None = None,
    error_code: str | None = None
) -> dict:
    resp = {"success": success, "timestamp": datetime.now(UTC).isoformat()}
    if message is not None:
        resp["message"] = message
    if data is not None:
        resp["data"] = data
    if errors is not None and len(errors) > 0:
        resp["errors"] = errors
    if error_code is not None:
        resp["error_code"] = error_code
    return resp


async def app_error_handler(request: Request, exc: AppError):
    headers = {}
    if exc.status_code == 503 and getattr(exc, "retry_after", None):
        headers["Retry-After"] = str(exc.retry_after)
        
    return JSONResponse(
        status_code=exc.status_code,
        content=make_envelope(
            success=False,
            message=exc.message,
            error_code=exc.error_code,
            errors=exc.details
        ),
        headers=headers if headers else None
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError | ValidationError):
    errors = []
    for err in exc.errors():
        loc = "->".join(str(l) for l in err["loc"])
        errors.append({"field": loc, "message": err["msg"]})
        
    return JSONResponse(
        status_code=422,
        content=make_envelope(
            success=False,
            message="Validation error",
            error_code="VALIDATION_ERROR",
            errors=errors
        )
    )


async def generic_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content=make_envelope(
            success=False,
            message="Internal server error",
            error_code="INTERNAL_ERROR"
        )
    )
