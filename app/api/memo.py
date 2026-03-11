from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.memo import MemoRequest, MemoResponse
from app.services.memo import generate_memo

router = APIRouter()


@router.post("/memo", response_model=MemoResponse)
async def memo(
    body: MemoRequest,
    db: AsyncSession = Depends(get_db),
) -> MemoResponse:
    result = await generate_memo(body.company, body.memo_type, db)
    return MemoResponse(**result)
