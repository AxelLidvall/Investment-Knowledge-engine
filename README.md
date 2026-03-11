# Investment Knowledge Engine

RAG system for an investment firm. Upload investment documents (annual reports, memos, diligence packs) and query them through a grounded chat interface with citations.

## Stack

- **Backend** — FastAPI, Python 3.11
- **Database** — PostgreSQL 15 + pgvector
- **Embeddings** — OpenAI `text-embedding-3-small`
- **LLM** — Anthropic Claude
- **Frontend** — React + Vite

## Quickstart

```bash
cp .env.example .env   # fill in your API keys
docker-compose up
```

Backend: http://localhost:8000
Frontend: http://localhost:5173
API docs: http://localhost:8000/docs

## Structure

```
app/        FastAPI backend (models, services, API routes)
ui/         React frontend
scripts/    Seed and reindex utilities
tests/      Pytest test suite
docs/       Architecture notes
```
