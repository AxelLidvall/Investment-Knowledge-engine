import re
from pathlib import Path

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.retrieval import retrieve_chunks

_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

_SYSTEM_PROMPT = (
    Path(__file__).parent.parent / "prompts" / "qa_system.txt"
).read_text()

# Matches [Source: filename, p.3] or [Source: filename]
_CITATION_RE = re.compile(r"\[Source:\s*([^\],]+?)(?:,\s*p\.(\d+))?\]")


def _build_context(chunks: list[dict]) -> str:
    parts = []
    for c in chunks:
        header = f"[Chunk {c['id']} | {c['document_name']} | p.{c['page_num']}]"
        parts.append(f"---\n{header}\n{c['text']}\n---")
    return "\n\n".join(parts)


def _parse_citations(text: str) -> tuple[str, list[str]]:
    """
    Extract [Source: ...] markers from the answer text.
    Returns (cleaned_answer, unique_sources).
    """
    sources: list[str] = []
    for match in _CITATION_RE.finditer(text):
        doc = match.group(1).strip()
        page = match.group(2)
        label = f"{doc}, p.{page}" if page else doc
        if label not in sources:
            sources.append(label)

    # Strip citation markers from the answer text
    cleaned = _CITATION_RE.sub("", text).strip()
    return cleaned, sources


async def answer_question(
    question: str,
    company: str,
    db: AsyncSession,
) -> dict:
    """
    Retrieve relevant chunks and call Claude to produce a grounded answer.

    Returns:
        answer: str  — cleaned answer text without inline citation markers
        sources: list[str]  — unique source labels extracted from citations
        chunk_ids: list[int]  — IDs of chunks used as context
    """
    chunks = await retrieve_chunks(question, company, db)

    if not chunks:
        return {
            "answer": "No relevant documents found for this company. Please upload documents before querying.",
            "sources": [],
            "chunk_ids": [],
        }

    context = _build_context(chunks)
    user_message = f"{context}\n\nQuestion: {question}"

    response = await _client.messages.create(
        model=settings.llm_model,
        max_tokens=1024,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_answer = response.content[0].text
    answer, sources = _parse_citations(raw_answer)

    return {
        "answer": answer,
        "sources": sources,
        "chunk_ids": [c["id"] for c in chunks],
    }
