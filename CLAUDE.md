# Investment Knowledge Engine

RAG system for an investment team. Ingests investment documents (annual reports, memos, diligence packs, board updates) and makes them queryable through a grounded chat interface with citations.

Full architecture: `docs/architecture.md`

---

## Stack

- **Backend**: FastAPI + Python 3.11
- **Database**: PostgreSQL 15 + pgvector
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dims)
- **LLM**: Anthropic Claude (`claude-sonnet-4-20250514`)
- **PDF parsing**: PyMuPDF (`fitz`)
- **Frontend**: React + Vite
- **Infra**: Docker Compose

---

## Project Structure

```
app/
├── main.py              # FastAPI entrypoint
├── config.py            # Settings via pydantic-settings
├── db.py                # Async SQLAlchemy engine + session
├── models/              # SQLAlchemy ORM models
│   ├── document.py
│   └── chunk.py
├── schemas/             # Pydantic request/response models
│   ├── document.py
│   ├── query.py
│   └── memo.py
├── services/
│   ├── ingestion/
│   │   ├── parser.py    # PDF → raw text via PyMuPDF
│   │   ├── chunker.py   # text → chunks (512 tok, 128 overlap)
│   │   └── embedder.py  # chunks → embeddings via OpenAI
│   ├── retrieval.py     # pgvector cosine search, MMR re-rank
│   ├── qa.py            # context assembly + Claude completion
│   └── memo.py          # memo generation with prompt variants
├── api/
│   ├── upload.py        # POST /upload
│   ├── query.py         # POST /query
│   ├── memo.py          # POST /memo
│   └── documents.py     # GET /documents, DELETE /documents/{id}
└── prompts/
    ├── qa_system.txt
    └── memo_system.txt
```

---

## Commands

```bash
# Start full stack
docker-compose up

# Run backend only (dev)
uvicorn app.main:app --reload --port 8000

# Run frontend (dev)
cd ui && npm run dev

# Run tests
pytest tests/ -v

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"
```

---

## Core Conventions

### Python
- Async throughout — use `async/await` for all DB calls and HTTP requests
- Type hints on all function signatures
- Pydantic models for all API inputs and outputs — never return raw dicts from endpoints
- Environment variables via `app/config.py` (pydantic-settings) — never `os.environ` directly
- Services contain business logic; API routes are thin (validate → call service → return)

### Database
- Use `pgvector` `<=>` operator for cosine distance queries
- All vector columns: `VECTOR(1536)` to match `text-embedding-3-small`
- Chunks store: `document_id`, `text`, `embedding`, `page_num`, `chunk_index`, `company`
- Always filter by `company` first, then rank by similarity — reduces search space

### RAG Pipeline
- Chunk size: 512 tokens, overlap: 128 tokens (RecursiveCharacterTextSplitter)
- Retrieval: top-k=8, then MMR re-rank to k=5 for diversity
- Citations: every QA response must include `[Source: <document_name>]` markers — the `qa_service` strips and surfaces these as structured metadata, never inline in the final response text
- Prompts live in `app/prompts/` — do not inline system prompts in service code

### API
- All endpoints return structured responses matching schemas in `app/schemas/`
- Upload endpoint returns `document_id`, `chunk_count`, `company`, `status`
- Query endpoint returns `answer`, `sources: list[str]`, `chunk_ids: list[int]`
- Memo endpoint returns `title`, `company`, `memo_type`, `content`, `generated_at`

---

## Environment Variables

See `.env.example`. Required:

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DATABASE_URL=postgresql+asyncpg://...
```

---

## Git

- Never commit directly — always stage changes and stop. The developer reviews and commits manually.

---

## What to Avoid

- Do not use `os.environ` directly — always go through `config.py`
- Do not put business logic in API route handlers
- Do not inline prompts in service files — use `app/prompts/`
- Do not use synchronous SQLAlchemy — this project is fully async
- Do not fabricate chunk counts or similarity scores in responses
- Do not store raw PDFs in the database — store parsed text and embeddings only
