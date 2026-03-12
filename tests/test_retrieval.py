"""
Tests for retrieval logic (MMR re-rank) and QA citation parsing.
Both are pure-Python functions with no external dependencies.
"""
import pytest

from app.services.qa import _parse_citations
from app.services.retrieval import _mmr_rerank


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _candidate(id_: int, similarity: float, embedding: list[float] | None = None) -> dict:
    """Build a minimal chunk candidate dict for MMR testing."""
    if embedding is None:
        embedding = [0.0] * 8
    return {
        "id": id_,
        "text": f"chunk {id_}",
        "page_num": 1,
        "chunk_index": id_,
        "company": "TestCo",
        "document_name": "test.pdf",
        "similarity": similarity,
        "embedding": embedding,
    }


# ---------------------------------------------------------------------------
# _mmr_rerank
# ---------------------------------------------------------------------------

class TestMmrRerank:
    def test_returns_all_when_fewer_than_k(self):
        candidates = [_candidate(i, 0.9 - i * 0.1) for i in range(3)]
        result = _mmr_rerank(candidates, k=5)
        assert result == candidates

    def test_returns_exactly_k_candidates(self):
        candidates = [_candidate(i, 0.9 - i * 0.05) for i in range(10)]
        result = _mmr_rerank(candidates, k=4)
        assert len(result) == 4

    def test_empty_input_returns_empty(self):
        assert _mmr_rerank([], k=5) == []

    def test_single_candidate_returns_it(self):
        c = [_candidate(0, 0.9)]
        assert _mmr_rerank(c, k=3) == c

    def test_first_selected_is_highest_similarity(self):
        candidates = [
            _candidate(0, 0.5),
            _candidate(1, 0.9),  # highest
            _candidate(2, 0.3),
        ]
        result = _mmr_rerank(candidates, k=2)
        assert result[0]["id"] == 1

    def test_diverse_embeddings_preferred_over_similar(self):
        """
        Given chunk A (highest sim) and chunk B (near-duplicate of A) vs chunk C
        (diverse direction), after selecting A the MMR algorithm should prefer C.
        """
        emb_a = [1.0, 0.0] + [0.0] * 6
        emb_b = [0.99, 0.01] + [0.0] * 6  # near-duplicate of A
        emb_c = [0.0, 1.0] + [0.0] * 6   # diverse

        candidates = [
            _candidate(0, 0.9, emb_a),
            _candidate(1, 0.85, emb_b),
            _candidate(2, 0.7, emb_c),
        ]
        result = _mmr_rerank(candidates, k=2)
        ids = {r["id"] for r in result}
        assert 0 in ids   # highest similarity always selected first
        assert 2 in ids   # diverse chunk preferred over near-duplicate

    def test_result_is_subset_of_candidates(self):
        candidates = [_candidate(i, 0.9 - i * 0.05) for i in range(8)]
        result = _mmr_rerank(candidates, k=3)
        candidate_ids = {c["id"] for c in candidates}
        assert all(r["id"] in candidate_ids for r in result)


# ---------------------------------------------------------------------------
# _parse_citations  (from qa.py)
# ---------------------------------------------------------------------------

class TestParseCitations:
    def test_extracts_source_with_page(self):
        text = "Revenue grew 20% [Source: annual_report.pdf, p.3]."
        answer, sources = _parse_citations(text)
        assert sources == ["annual_report.pdf, p.3"]

    def test_extracts_source_without_page(self):
        text = "Founded in 2000 [Source: company_overview.pdf]."
        answer, sources = _parse_citations(text)
        assert sources == ["company_overview.pdf"]

    def test_inline_markers_stripped_from_answer(self):
        text = "Revenue grew [Source: report.pdf, p.1]."
        answer, _ = _parse_citations(text)
        assert "[Source:" not in answer

    def test_deduplicates_repeated_sources(self):
        text = (
            "Revenue grew [Source: report.pdf, p.1]. "
            "Costs fell [Source: report.pdf, p.1]."
        )
        _, sources = _parse_citations(text)
        assert sources.count("report.pdf, p.1") == 1

    def test_multiple_unique_sources(self):
        text = "A [Source: a.pdf, p.1] and B [Source: b.pdf, p.2]."
        _, sources = _parse_citations(text)
        assert len(sources) == 2
        assert "a.pdf, p.1" in sources
        assert "b.pdf, p.2" in sources

    def test_no_citations_returns_empty_sources(self):
        text = "No citations here."
        answer, sources = _parse_citations(text)
        assert sources == []
        assert answer == text

    def test_empty_string(self):
        answer, sources = _parse_citations("")
        assert answer == ""
        assert sources == []
