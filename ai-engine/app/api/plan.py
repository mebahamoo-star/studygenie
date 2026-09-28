from fastapi import APIRouter, Depends, Request
from app.security import verify_internal_token
from app.schemas.plan import GeneratePlanRequest
from app.services.planner import generate_plan
from app.errors import make_envelope

router = APIRouter()

@router.post("/v1/generate-plan")
async def generate_plan_endpoint(
    req: GeneratePlanRequest,
    request: Request,
    token: str = Depends(verify_internal_token)
):
    result_data = generate_plan(req)
    
    return make_envelope(True, data=result_data.model_dump())
