import sys
import uuid
import time
import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.config import settings
from app.errors import (
    AppError,
    app_error_handler,
    validation_exception_handler,
    generic_exception_handler,
    make_envelope
)


logger = logging.getLogger(__name__)

def create_app() -> FastAPI:
    if not settings.ai_internal_token or len(settings.ai_internal_token) < 16:
        print("ERROR: AI_INTERNAL_TOKEN is missing or shorter than 16 characters.")
        sys.exit(1)

    app = FastAPI(
        title="StudyGenie AI Engine",
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url=None,
    )

    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    @app.middleware("http")
    async def request_logger_and_id(request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = req_id
        start_time = time.time()
        
        response = await call_next(request)
        
        duration_ms = int((time.time() - start_time) * 1000)
        response.headers["X-Request-ID"] = req_id
        
        # log tokens if present in response state
        tokens = getattr(request.state, "token_usage", "")
        if tokens:
            tokens = f" tokens={tokens}"
            
        logger.info(f"req_id={req_id} method={request.method} path={request.url.path} status={response.status_code} duration_ms={duration_ms}{tokens}")
        
        return response

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc: Exception):
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=404,
            content=make_envelope(False, "Not found", error_code="NOT_FOUND")
        )

    # Register Routers (will do in next step)
    from app.api.health import router as health_router
    from app.api.parse import router as parse_router
    from app.api.study_kit import router as study_kit_router
    from app.api.plan import router as plan_router

    app.include_router(health_router)
    app.include_router(parse_router)
    app.include_router(study_kit_router)
    app.include_router(plan_router)

    return app

app = create_app()
