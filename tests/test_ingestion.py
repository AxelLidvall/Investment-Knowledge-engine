"""
Tests for the ingestion pipeline: parser, chunker, embedder.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import fitz
import pytest

from app.services.ingestion.chunker import chunk_pages
from app.services.ingestion.parser import parse_pdf


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_pdf(text: str = "Hello World. This is a test document.") -> bytes:
    """Create a minimal in-memory PDF with a single page of text."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    return doc.tobytes()


def _make_multipage_pdf(texts: list[str]) -> bytes:
    """Create an in-memory PDF with one page per entry in `texts`."""
    doc = fitz.open()
    for t in texts:
        page = doc.new_page()
        if t:
            page.insert_text((72, 72), t)
    return doc.tobytes()


# ---------------------------------------------------------------------------
# parse_pdf
# ---------------------------------------------------------------------------

class TestParsePdf:
    def test_returns_one_entry_per_page_with_text(self):
        pdf_bytes = _make_pdf("Acme Corp revenue is $500M.")
        pages = parse_pdf(pdf_bytes)
        assert len(pages) == 1
        assert "Acme" in pages[0]["text"]

    def test_page_num_is_1_indexed(self):
        pdf_bytes = _make_pdf()
        pages = parse_pdf(pdf_bytes)
        assert pages[0]["page_num"] == 1

    def test_skips_blank_pages(self):
        pdf_bytes = _make_multipage_pdf(["", ""])  # two blank pages
        pages = parse_pdf(pdf_bytes)
        assert pages == []

    def test_blank_pages_are_excluded_from_results(self):
        pdf_bytes = _make_multipage_pdf(["", "Page two content here."])
        pages = parse_pdf(pdf_bytes)
        assert len(pages) == 1
        assert pages[0]["page_num"] == 2

    def test_multipage_pdf_preserves_order(self):
        texts = [f"Page {i + 1} content." for i in range(3)]
        pdf_bytes = _make_multipage_pdf(texts)
        pages = parse_pdf(pdf_bytes)
        assert len(pages) == 3
        assert [p["page_num"] for p in pages] == [1, 2, 3]

    def test_output_keys_are_correct(self):
        pages = parse_pdf(_make_pdf())
        assert set(pages[0].keys()) == {"page_num", "text"}


# ---------------------------------------------------------------------------
# chunk_pages
# ---------------------------------------------------------------------------

class TestChunkPages:
    def test_returns_chunks_for_each_page(self, sample_pages):
        chunks = chunk_pages(sample_pages)
        assert len(chunks) >= len(sample_pages)

    def test_chunk_has_required_keys(self, sample_pages):
        for chunk in chunk_pages(sample_pages):
            assert "page_num" in chunk
            assert "chunk_index" in chunk
            assert "text" in chunk

    def test_global_chunk_index_is_contiguous(self, sample_pages):
        chunks = chunk_pages(sample_pages)
        indices = [c["chunk_index"] for c in chunks]
        assert indices == list(range(len(chunks)))

    def test_empty_pages_returns_empty(self):
        assert chunk_pages([]) == []

    def test_long_text_is_split_into_multiple_chunks(self):
        long_text = "word " * 300  # ~1 500 chars, well above 512-char chunk size
        chunks = chunk_pages([{"page_num": 1, "text": long_text}])
        assert len(chunks) > 1

    def test_page_num_is_preserved_in_chunks(self, sample_pages):
        chunks = chunk_pages(sample_pages)
        page_nums = {c["page_num"] for c in chunks}
        assert page_nums == {p["page_num"] for p in sample_pages}


# ---------------------------------------------------------------------------
# embed_chunks
# ---------------------------------------------------------------------------

class TestEmbedChunks:
    async def test_adds_embedding_to_each_chunk(self, sample_chunks):
        fake_embedding = [0.1] * 1536
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=fake_embedding) for _ in sample_chunks]

        with patch("app.services.ingestion.embedder._client") as mock_client:
            mock_client.embeddings.create = AsyncMock(return_value=mock_response)
            from app.services.ingestion.embedder import embed_chunks

            result = await embed_chunks(list(sample_chunks))

        assert all("embedding" in c for c in result)
        assert result[0]["embedding"] == fake_embedding

    async def test_preserves_existing_chunk_fields(self, sample_chunks):
        fake_embedding = [0.0] * 1536
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=fake_embedding) for _ in sample_chunks]

        with patch("app.services.ingestion.embedder._client") as mock_client:
            mock_client.embeddings.create = AsyncMock(return_value=mock_response)
            from app.services.ingestion.embedder import embed_chunks

            result = await embed_chunks(list(sample_chunks))

        assert result[0]["text"] == sample_chunks[0]["text"]
        assert result[0]["page_num"] == sample_chunks[0]["page_num"]
        assert result[0]["chunk_index"] == sample_chunks[0]["chunk_index"]

    async def test_embedding_length_matches_model_dims(self, sample_chunks):
        fake_embedding = [0.1] * 1536
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=fake_embedding) for _ in sample_chunks]

        with patch("app.services.ingestion.embedder._client") as mock_client:
            mock_client.embeddings.create = AsyncMock(return_value=mock_response)
            from app.services.ingestion.embedder import embed_chunks

            result = await embed_chunks(list(sample_chunks))

        assert len(result[0]["embedding"]) == 1536
