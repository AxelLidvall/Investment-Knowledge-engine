from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    company: str = Field(..., min_length=1, max_length=255)


class QueryResponse(BaseModel):
    answer: str
    sources: list[str]
    chunk_ids: list[int]
