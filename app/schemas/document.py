from datetime import datetime
from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    document_id: int
    filename: str
    company: str
    doc_type: str
    chunk_count: int
    status: str


class DocumentListItem(BaseModel):
    id: int
    filename: str
    company: str
    doc_type: str
    uploaded_at: datetime
    chunk_count: int
