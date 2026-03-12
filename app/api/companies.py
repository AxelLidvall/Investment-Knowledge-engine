from fastapi import APIRouter, Depends
from sqlalchemy import distinct, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.chunk import Chunk

router = APIRouter()


@router.get("/companies", response_model=list[str])
async def list_companies(db: AsyncSession = Depends(get_db)) -> list[str]:
    """Return a sorted list of distinct company names that have ingested chunks."""
    result = await db.execute(
        select(distinct(Chunk.company)).order_by(Chunk.company)
    )
    return list(result.scalars().all())
