
import pytest
from fpdf import FPDF

from app.errors import AppError
from app.services.pdf_extractor import extract_pdf_content


def create_pdf(text="Hello", pages=1):
    pdf = FPDF()
    for _ in range(pages):
        pdf.add_page()
        pdf.set_font("Helvetica", size=12)
        pdf.cell(200, 10, text=text, new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output())

def test_extract_pdf_valid():
    pdf_bytes = create_pdf("Valid PDF Text")
    text, num_pages, method = extract_pdf_content(pdf_bytes)
    assert num_pages == 1
    # Short text uses pdf_vision
    assert method == "pdf_vision"
    assert "Valid PDF Text" in text

def test_extract_pdf_too_large(monkeypatch):
    import app.services.pdf_extractor as pe
    monkeypatch.setattr(pe.settings, "max_pdf_mb", 0) # 0 MB limit
    with pytest.raises(AppError) as exc:
        extract_pdf_content(b"%PDF-1.4\n12345")
    assert exc.value.status_code == 413

def test_not_a_pdf():
    with pytest.raises(AppError) as exc:
        extract_pdf_content(b"just text")
    assert exc.value.status_code == 415

def test_too_many_pages(monkeypatch):
    import app.services.pdf_extractor as pe
    monkeypatch.setattr(pe.settings, "max_pdf_pages", 1)
    pdf_bytes = create_pdf("Page", pages=2)
    with pytest.raises(AppError) as exc:
        extract_pdf_content(pdf_bytes)
    assert exc.value.status_code == 422
