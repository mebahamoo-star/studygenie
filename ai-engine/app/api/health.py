from fastapi import APIRouter

from app.config import settings

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "UP",
        "service": "ai-engine",
        "env": settings.app_env,
        "provider": settings.llm_provider,
        "provider_configured": (settings.llm_provider == "fake") or (bool(settings.gemini_api_key))
    }
