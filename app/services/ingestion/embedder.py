import openai

from app.config import settings

_client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

BATCH_SIZE = 100  # OpenAI allows up to 2048 inputs per request; 100 is safe


async def embed_chunks(chunks: list[dict]) -> list[dict]:
    """
    Add an 'embedding' key to each chunk dict by calling the OpenAI embeddings API.

    Args:
        chunks: Output of chunker.chunk_pages — list of dicts with 'text'.

    Returns:
        Same list with 'embedding': list[float] added to each item.
    """
    texts = [c["text"] for c in chunks]
    embeddings = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        response = await _client.embeddings.create(
            model=settings.embedding_model,
            input=batch,
        )
        embeddings.extend([item.embedding for item in response.data])

    for chunk, embedding in zip(chunks, embeddings):
        chunk["embedding"] = embedding

    return chunks
