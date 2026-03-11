import fitz  # PyMuPDF


def parse_pdf(file_bytes: bytes) -> list[dict]:
    """
    Extract text from a PDF, returning one entry per page.

    Returns:
        List of {"page_num": int, "text": str} dicts (1-indexed pages).
        Pages with no extractable text are skipped.
    """
    pages = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page_index, page in enumerate(doc, start=1):
            text = page.get_text().strip()
            if text:
                pages.append({"page_num": page_index, "text": text})
    return pages
