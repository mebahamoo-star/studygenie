import io
import pdfplumber
from app.errors import AppError
from app.config import settings

def extract_pdf_content(file_bytes: bytes) -> tuple[str, int, str]:
    """
    Returns (extracted_text, num_pages, extraction_method).
    Raises AppError on validation failures.
    """
    if len(file_bytes) > settings.max_pdf_mb * 1024 * 1024:
        raise AppError(status_code=413, error_code="FILE_TOO_LARGE", message=f"File exceeds {settings.max_pdf_mb}MB limit")
        
    if not file_bytes.startswith(b"%PDF-"):
        raise AppError(status_code=415, error_code="NOT_A_PDF", message="File does not have PDF magic bytes")

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            if pdf.doc.catalog.get("Encrypt"):
                raise AppError(status_code=422, error_code="PDF_ENCRYPTED", message="PDF is encrypted")
                
            num_pages = len(pdf.pages)
            if num_pages > settings.max_pdf_pages:
                raise AppError(status_code=422, error_code="TOO_MANY_PAGES", message=f"PDF has {num_pages} pages, max is {settings.max_pdf_pages}")
                
            text_parts = []
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text_parts.append(extracted)
                    
            text = "\n".join(text_parts)
            # Normalize whitespace
            text = " ".join(text.split())
            
            if len(text) < settings.min_text_chars_for_text_mode:
                return text, num_pages, "pdf_vision"
            
            return text, num_pages, "text"
            
    except AppError:
        raise
    except Exception as e:
        raise AppError(status_code=422, error_code="PDF_UNREADABLE", message=f"Could not read PDF: {str(e)}")
