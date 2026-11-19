from fastapi import APIRouter

from app.config import settings

router = APIRouter()

@router.get("/")
async def root():
    return {
        "status": "UP",
        "service": "ai-engine",
        "docs": "/docs",
        "health": "/health"
    }

@router.get("/health")
async def health_check():
    return {
        "status": "UP",
        "service": "ai-engine",
        "env": settings.app_env,
        "provider": settings.llm_provider,
        "provider_configured": (settings.llm_provider == "fake") or (bool(settings.gemini_api_key))
    }
