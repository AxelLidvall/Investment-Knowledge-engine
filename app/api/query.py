from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.query import QueryRequest, QueryResponse
from app.services.qa import answer_question

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query(
    body: QueryRequest,
    db: AsyncSession = Depends(get_db),
) -> QueryResponse:
    result = await answer_question(body.question, body.company, db)
    return QueryResponse(**result)
