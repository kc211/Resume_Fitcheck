"""Extract plain text from an uploaded resume (PDF, DOCX, or TXT)."""
from __future__ import annotations

import io

from docx import Document
from pypdf import PdfReader

MAX_PDF_PAGES = 15


class ExtractionError(Exception):
    """Raised when a file can't be parsed into text."""


def extract_text(filename: str, data: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "txt":
        return _decode_txt(data)
    if ext == "pdf":
        return _extract_pdf(data)
    if ext == "docx":
        return _extract_docx(data)
    raise ExtractionError(f"Unsupported file type: .{ext}. Use PDF, DOCX, or TXT.")


def _decode_txt(data: bytes) -> str:
    for enc in ("utf-8", "latin-1"):
        try:
            return data.decode(enc).strip()
        except UnicodeDecodeError:
            continue
    raise ExtractionError("Could not decode the text file.")


def _extract_pdf(data: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001 - surface any pypdf failure uniformly
        raise ExtractionError(f"Could not read the PDF: {exc}") from exc

    parts = []
    for page in reader.pages[:MAX_PDF_PAGES]:
        parts.append(page.extract_text() or "")
    text = "\n".join(parts).strip()
    if not text:
        raise ExtractionError(
            "No extractable text found in the PDF (it may be a scanned image)."
        )
    return text


def _extract_docx(data: bytes) -> str:
    try:
        doc = Document(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001
        raise ExtractionError(f"Could not read the DOCX: {exc}") from exc
    text = "\n".join(p.text for p in doc.paragraphs).strip()
    if not text:
        raise ExtractionError("The DOCX file appears to be empty.")
    return text
