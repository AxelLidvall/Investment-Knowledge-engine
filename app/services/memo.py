import re
from datetime import datetime, timezone
from pathlib import Path

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chunk import Chunk
from app.schemas.memo import MemoType
from app.services.retrieval import retrieve_chunks

_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

_SYSTEM_PROMPT_FULL = (
    Path(__file__).parent.parent / "prompts" / "memo_system.txt"
).read_text()

# Synthetic retrieval questions per memo type — broad enough to surface all relevant chunks
_RETRIEVAL_QUESTIONS: dict[MemoType, str] = {
    MemoType.summary: (
        "What does this company do, what are its key financials, metrics, and recent developments?"
    ),
    MemoType.thesis: (
        "What is the investment case, competitive advantage, growth drivers, and key catalysts?"
    ),
    MemoType.risk: (
        "What are the key risks, red flags, financial concerns, and operational issues?"
    ),
}

# Matches [summary], [thesis], or [risk] section headers in the prompt file
_SECTION_RE = re.compile(r"\[(?:summary|thesis|risk)\].*", re.DOTALL)
_VARIANT_RE = re.compile(
    r"\[(summary|thesis|risk)\](.*?)(?=\n\[(?:summary|thesis|risk)\]|$)", re.DOTALL
)


def _extract_prompt_variant(memo_type: MemoType) -> str:
    """Return the base rules + the instructions for the requested memo type only."""
    base, *_ = _SECTION_RE.split(_SYSTEM_PROMPT_FULL, maxsplit=1)

    for match in _VARIANT_RE.finditer(_SYSTEM_PROMPT_FULL):
        if match.group(1) == memo_type.value:
            variant_instructions = match.group(2).strip()
            return f"{base.strip()}\n\n{variant_instructions}"

    return base.strip()


def _build_context(chunks: list[dict]) -> str:
    parts = []
    for c in chunks:
        header = f"[Chunk {c['id']} | {c['document_name']} | p.{c['page_num']}]"
        parts.append(f"---\n{header}\n{c['text']}\n---")
    return "\n\n".join(parts)


async def _get_canonical_company(company: str, db: AsyncSession) -> str | None:
    """
    Return the exact company name string as stored in the DB,
    or None if no chunks exist for this company.

    This normalises the company tag so memo titles are consistent
    with how the data was indexed.
    """
    stmt = select(Chunk.company).where(Chunk.company == company).limit(1)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def generate_memo(
    company: str,
    memo_type: MemoType,
    db: AsyncSession,
) -> dict:
    """
    Retrieve relevant chunks for the company and generate a structured memo.

    Returns:
        title, company, memo_type, content, generated_at
    """
    canonical_company = await _get_canonical_company(company, db)
    if canonical_company is None:
        return {
            "title": f"{memo_type.value.capitalize()} Memo — {company}",
            "company": company,
            "memo_type": memo_type,
            "content": (
                f"No documents found for company '{company}'. "
                "Please upload documents before generating a memo."
            ),
            "generated_at": datetime.now(timezone.utc),
        }

    question = _RETRIEVAL_QUESTIONS[memo_type]
    chunks = await retrieve_chunks(question, canonical_company, db)

    context = _build_context(chunks)
    system_prompt = _extract_prompt_variant(memo_type)

    user_message = (
        f"Company: {canonical_company}\n"
        f"Memo type: {memo_type.value}\n\n"
        f"{context}\n\n"
        f"Write the {memo_type.value} memo for {canonical_company}."
    )

    response = await _client.messages.create(
        model=settings.llm_model,
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    return {
        "title": f"{memo_type.value.capitalize()} Memo — {canonical_company}",
        "company": canonical_company,
        "memo_type": memo_type,
        "content": response.content[0].text,
        "generated_at": datetime.now(timezone.utc),
    }
