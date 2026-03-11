from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.chunk import Chunk
from app.models.document import Document
from app.schemas.document import DocumentUploadResponse
from app.services.ingestion.chunker import chunk_pages
from app.services.ingestion.embedder import embed_chunks
from app.services.ingestion.parser import parse_pdf

router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile,
    company: str = Form(...),
    doc_type: str = Form(...),
    session: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()

    # 1. Parse PDF → pages
    pages = parse_pdf(file_bytes)
    if not pages:
        raise HTTPException(status_code=422, detail="No extractable text found in PDF.")

    # 2. Chunk pages → chunk dicts
    chunks = chunk_pages(pages)

    # 3. Embed chunks → add 'embedding' to each dict
    chunks = await embed_chunks(chunks)

    # 4. Persist document row
    document = Document(
        filename=file.filename or "unknown.pdf",
        company=company,
        doc_type=doc_type,
    )
    session.add(document)
    await session.flush()  # get document.id without committing

    # 5. Persist chunk rows
    db_chunks = [
        Chunk(
            document_id=document.id,
            text=c["text"],
            embedding=c["embedding"],
            page_num=c["page_num"],
            chunk_index=c["chunk_index"],
            company=company,
        )
        for c in chunks
    ]
    session.add_all(db_chunks)
    await session.commit()

    return DocumentUploadResponse(
        document_id=document.id,
        filename=document.filename,
        company=company,
        doc_type=doc_type,
        chunk_count=len(db_chunks),
        status="indexed",
    )
