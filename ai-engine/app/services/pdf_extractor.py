import io
import re

import pdfplumber
from pptx import Presentation

from app.config import settings
from app.errors import AppError


def _clean_structured_text(raw_text: str) -> str:
    """Cleans up document text while preserving headings, slide boundaries, and paragraphs."""
    if not raw_text:
        return ""
    lines = []
    for line in raw_text.splitlines():
        # Collapse multiple horizontal spaces/tabs into a single space
        cleaned = re.sub(r"[ \t]+", " ", line).strip()
        lines.append(cleaned)
    combined = "\n".join(lines)
    # Collapse three or more consecutive linebreaks into two (paragraph break)
    combined = re.sub(r"\n{3,}", "\n\n", combined)
    return combined.strip()


def extract_document_content(file_bytes: bytes, filename: str | None = None) -> tuple[str, int, str]:
    """
    Extracts text content and page/slide count from PDF, PPTX, PPT, or TXT documents.
    Returns (extracted_text, num_pages_or_slides, extraction_method).
    Raises AppError on validation failures.
    """
    max_mb = settings.max_pdf_mb if settings.max_pdf_mb > 0 else 0
    max_bytes = max_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise AppError(status_code=413, error_code="FILE_TOO_LARGE", message=f"File exceeds limit of {settings.max_pdf_mb}MB")

    lower_filename = (filename or "").lower()

    # 1. Check if it's a PowerPoint (.pptx)
    is_pptx = lower_filename.endswith(".pptx") or (file_bytes.startswith(b"PK\x03\x04") and not file_bytes.startswith(b"%PDF-"))
    if is_pptx:
        try:
            prs = Presentation(io.BytesIO(file_bytes))
            num_slides = len(prs.slides)
            if num_slides > 150:
                raise AppError(status_code=422, error_code="TOO_MANY_SLIDES", message=f"Presentation has {num_slides} slides, max is 150")

            text_parts = []
            for idx, slide in enumerate(prs.slides):
                slide_texts = []
                # Slide Title
                if slide.shapes.title and slide.shapes.title.text:
                    title_text = slide.shapes.title.text.strip()
                    if title_text:
                        slide_texts.append(f"--- Slide {idx+1}: {title_text} ---")
                else:
                    slide_texts.append(f"--- Slide {idx+1} ---")

                # Slide Body Text & Tables
                for shape in slide.shapes:
                    if shape.has_text_frame and shape != slide.shapes.title:
                        for paragraph in shape.text_frame.paragraphs:
                            p_text = paragraph.text.strip()
                            # Ignore empty or duplicate title text
                            if p_text and p_text not in slide_texts:
                                slide_texts.append(p_text)

                    if shape.has_table:
                        for row in shape.table.rows:
                            row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                            if row_text:
                                slide_texts.append(" | ".join(row_text))

                # Speaker Notes
                if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                    notes = slide.notes_slide.notes_text_frame.text.strip()
                    if notes:
                        slide_texts.append(f"Speaker Notes: {notes}")

                text_parts.append("\n".join(slide_texts))

            full_text = _clean_structured_text("\n\n".join(text_parts))
            if len(full_text) < 20:
                full_text = f"PowerPoint presentation with {num_slides} slides."
            return full_text, max(1, num_slides), "pptx_text"
        except AppError:
            raise
        except Exception as e:
            # If PPTX parser fails, fallback to string extraction
            pass

    # 2. Check if it's a legacy PowerPoint (.ppt)
    if lower_filename.endswith(".ppt"):
        try:
            strings = re.findall(b"[\x20-\x7E\t\r\n]{4,}", file_bytes)
            text = "\n".join(s.decode("latin1", errors="ignore") for s in strings)
            text = _clean_structured_text(text)
            if len(text) > 30:
                return text, 1, "ppt_text"
        except Exception:
            pass

    # 3. Check if it's a PDF
    is_pdf = file_bytes.startswith(b"%PDF-") or lower_filename.endswith(".pdf")
    if is_pdf:
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

                text = _clean_structured_text("\n\n".join(text_parts))
                if len(text) < settings.min_text_chars_for_text_mode:
                    return text, num_pages, "pdf_vision"
                return text, num_pages, "pdf"
        except AppError:
            raise
        except Exception as e:
            raise AppError(status_code=422, error_code="PDF_UNREADABLE", message=f"Could not read PDF: {e!s}")

    # 4. Check if plain text / markdown
    if lower_filename.endswith((".txt", ".md", ".csv")):
        try:
            text = file_bytes.decode("utf-8", errors="ignore")
            text = _clean_structured_text(text)
            return text, 1, "text"
        except Exception:
            pass

    # If format is unrecognized
    raise AppError(
        status_code=415,
        error_code="UNSUPPORTED_FORMAT",
        message="Unsupported file type. Please upload a PDF (.pdf) or PowerPoint (.pptx, .ppt) presentation."
    )


def extract_pdf_content(file_bytes: bytes, filename: str | None = None) -> tuple[str, int, str]:
    """Backward compatibility wrapper."""
    return extract_document_content(file_bytes, filename)
