from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class MemoType(str, Enum):
    summary = "summary"
    thesis = "thesis"
    risk = "risk"


class MemoRequest(BaseModel):
    company: str = Field(..., min_length=1, max_length=255)
    memo_type: MemoType


class MemoResponse(BaseModel):
    title: str
    company: str
    memo_type: MemoType
    content: str
    generated_at: datetime
