from fastapi import APIRouter, Depends, Request
from app.security import verify_internal_token
from app.schemas.study_kit import GenerateStudyKitRequest
from app.services.study_kit_generator import generate_study_kit
from app.errors import make_envelope

router = APIRouter()

@router.post("/v1/generate-study-kit")
async def generate_study_kit_endpoint(
    req: GenerateStudyKitRequest,
    request: Request,
    token: str = Depends(verify_internal_token)
):
    result_data = await generate_study_kit(req)
    
    result_data.meta.request_id = getattr(request.state, "request_id", "")
    request.state.token_usage = f"p={result_data.meta.usage.prompt_tokens} o={result_data.meta.usage.output_tokens}"
    
    return make_envelope(True, data=result_data.model_dump())
