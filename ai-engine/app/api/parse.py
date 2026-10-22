from fastapi import APIRouter, UploadFile, File, Form, Depends, Header, Request

from app.security import verify_internal_token
from app.errors import AppError, make_envelope
from app.schemas.parse import ParseResponseData
from app.services.pdf_extractor import extract_pdf_content
from app.services.syllabus_parser import parse_syllabus

router = APIRouter()

@router.post("/v1/parse-syllabus", response_model=dict)
@router.post("/parse-syllabus", response_model=dict)
async def parse_syllabus_endpoint(
    request: Request,
    file: UploadFile = File(...),
    course_name: str | None = Form(None, max_length=150),
    language_hint: str = Form("auto"),
    token: str = Depends(verify_internal_token)
):
    file_bytes = await file.read()
    filename = file.filename or ""
    
    extracted_text, pages, extraction_method = extract_pdf_content(file_bytes, filename=filename)
    
    result_data = await parse_syllabus(
        file_bytes=file_bytes,
        course_name=course_name,
        language_hint=language_hint,
        extracted_text=extracted_text,
        pages=pages,
        extraction_method=extraction_method,
        filename=filename
    )
    
    # Fill request ID
    result_data.meta.request_id = getattr(request.state, "request_id", "")
    
    # Log usage
    request.state.token_usage = f"p={result_data.meta.usage.prompt_tokens} o={result_data.meta.usage.output_tokens}"
    
    return make_envelope(True, data=result_data.model_dump())
