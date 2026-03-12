from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.chunk import Chunk
from app.models.document import Document
from app.schemas.document import DocumentListItem

router = APIRouter()


@router.get("/documents", response_model=list[DocumentListItem])
async def list_documents(
    company: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentListItem]:
    """
    List all ingested documents with their chunk counts.

    Optional filters:
    - company: exact match on company name
    - date_from / date_to: inclusive range on uploaded_at (YYYY-MM-DD)
    """
    stmt = (
        select(
            Document.id,
            Document.filename,
            Document.company,
            Document.doc_type,
            Document.uploaded_at,
            func.count(Chunk.id).label("chunk_count"),
        )
        .outerjoin(Chunk, Chunk.document_id == Document.id)
        .group_by(Document.id)
        .order_by(Document.uploaded_at.desc())
    )

    if company:
        stmt = stmt.where(Document.company == company)
    if date_from:
        stmt = stmt.where(func.date(Document.uploaded_at) >= date_from)
    if date_to:
        stmt = stmt.where(func.date(Document.uploaded_at) <= date_to)

    result = await db.execute(stmt)
    rows = result.mappings().all()

    return [
        DocumentListItem(
            id=row["id"],
            filename=row["filename"],
            company=row["company"],
            doc_type=row["doc_type"],
            uploaded_at=row["uploaded_at"],
            chunk_count=row["chunk_count"],
        )
        for row in rows
    ]


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Delete a document and all its chunks (cascade)."""
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")

    await db.delete(doc)
    await db.commit()

    return {"status": "deleted", "document_id": str(doc_id)}
