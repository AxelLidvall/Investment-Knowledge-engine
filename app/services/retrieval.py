import numpy as np
import openai
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chunk import Chunk
from app.models.document import Document

_client = openai.AsyncOpenAI(api_key=settings.openai_api_key)


async def _embed_query(question: str) -> list[float]:
    response = await _client.embeddings.create(
        model=settings.embedding_model,
        input=question,
    )
    return response.data[0].embedding


def _mmr_rerank(
    candidates: list[dict],
    k: int,
    lambda_mult: float = 0.5,
) -> list[dict]:
    """
    Maximal Marginal Relevance re-rank.

    Selects k chunks that balance relevance (cosine similarity to query)
    with diversity (low similarity to already-selected chunks).

    lambda_mult=1.0 → pure relevance, 0.0 → pure diversity.
    """
    if len(candidates) <= k:
        return candidates

    embeddings = np.array([c["embedding"] for c in candidates], dtype=np.float32)
    scores = np.array([c["similarity"] for c in candidates], dtype=np.float32)

    selected_indices: list[int] = []
    remaining = list(range(len(candidates)))

    # First pick: highest similarity
    best = int(np.argmax(scores))
    selected_indices.append(best)
    remaining.remove(best)

    while len(selected_indices) < k and remaining:
        selected_embeddings = embeddings[selected_indices]
        mmr_scores = []
        for idx in remaining:
            relevance = scores[idx]
            # Max cosine similarity to any already-selected chunk
            sim_to_selected = float(
                np.max(
                    selected_embeddings @ embeddings[idx]
                    / (
                        np.linalg.norm(selected_embeddings, axis=1)
                        * np.linalg.norm(embeddings[idx])
                        + 1e-10
                    )
                )
            )
            mmr = lambda_mult * relevance - (1 - lambda_mult) * sim_to_selected
            mmr_scores.append((idx, mmr))

        best_idx = max(mmr_scores, key=lambda x: x[1])[0]
        selected_indices.append(best_idx)
        remaining.remove(best_idx)

    return [candidates[i] for i in selected_indices]


async def retrieve_chunks(
    question: str,
    company: str,
    db: AsyncSession,
) -> list[dict]:
    """
    Embed the question, run pgvector cosine search filtered by company,
    then MMR re-rank to final top-k.

    Returns a list of dicts with keys:
        id, text, page_num, chunk_index, company, document_name, similarity, embedding
    """
    query_embedding = await _embed_query(question)
    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    stmt = (
        select(
            Chunk.id,
            Chunk.text,
            Chunk.page_num,
            Chunk.chunk_index,
            Chunk.company,
            Chunk.embedding,
            Document.filename.label("document_name"),
            (1 - Chunk.embedding.cosine_distance(text(f"'{embedding_str}'::vector"))).label(
                "similarity"
            ),
        )
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.company == company)
        .order_by(text("similarity DESC"))
        .limit(settings.retrieval_top_k)
    )

    result = await db.execute(stmt)
    rows = result.mappings().all()

    candidates = [
        {
            "id": row["id"],
            "text": row["text"],
            "page_num": row["page_num"],
            "chunk_index": row["chunk_index"],
            "company": row["company"],
            "document_name": row["document_name"],
            "similarity": float(row["similarity"]),
            "embedding": list(row["embedding"]),
        }
        for row in rows
    ]

    return _mmr_rerank(candidates, k=settings.retrieval_mmr_k)
