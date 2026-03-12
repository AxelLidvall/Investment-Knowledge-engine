# Investment Knowledge Engine

A RAG system built for investment teams. Upload annual reports, diligence packs, board updates, and investment memos — then query them through a grounded chat interface that cites its sources.

![Stack](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat-square) ![Stack](https://img.shields.io/badge/Claude-Sonnet-D97706?style=flat-square) ![Stack](https://img.shields.io/badge/pgvector-0.7-336791?style=flat-square) ![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square)

---

## What it does

- **Upload** PDFs (annual reports, memos, diligence packs) tagged to a company
- **Ask** natural-language questions — answers are grounded in the documents with page-level citations
- **Generate** investment memos (bull case, bear case, or full thesis) from the uploaded material
- **Browse** the document library — list, filter by company, delete

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│              React + Vite  (port 5173)                  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────────────────┐
│                   FastAPI Backend                        │
│                    (port 8000)                           │
│                                                         │
│  POST /api/upload      ── ingestion pipeline            │
│  POST /api/query       ── retrieval + QA                │
│  POST /api/memo        ── memo generation               │
│  GET  /api/documents   ── document library              │
│  GET  /api/companies   ── company list                  │
└────────┬─────────────────────────┬───────────────────────┘
         │                         │
┌────────▼────────┐     ┌──────────▼──────────┐
│   PostgreSQL 16 │     │    External APIs     │
│   + pgvector    │     │                      │
│                 │     │  OpenAI Embeddings   │
│  documents      │     │  text-embedding-3-   │
│  chunks         │     │  small (1536 dims)   │
│  VECTOR(1536)   │     │                      │
└─────────────────┘     │  Anthropic Claude    │
                        │  claude-sonnet-4-    │
                        │  20250514            │
                        └──────────────────────┘
```

### Ingestion pipeline

```
PDF upload
    │
    ▼
PyMuPDF (fitz)          — extract raw text, preserve page numbers
    │
    ▼
RecursiveCharacterTextSplitter
  chunk_size=512 tokens
  overlap=128 tokens     — sliding window keeps context across boundaries
    │
    ▼
OpenAI text-embedding-3-small
  1536-dimensional vectors
    │
    ▼
PostgreSQL + pgvector   — store chunks with embeddings, page_num, company tag
```

### Query pipeline

```
User question
    │
    ▼
Embed question (same model as ingestion)
    │
    ▼
pgvector cosine search  — top-k=8, filtered by company
    │
    ▼
MMR re-rank to k=5      — Maximal Marginal Relevance balances
                          relevance vs. diversity of retrieved chunks
    │
    ▼
Claude Sonnet           — grounded answer with [Source: doc, p.N] markers
    │
    ▼
Citation extraction     — markers stripped from answer text,
                          surfaced as structured source list
```

---

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.11, async SQLAlchemy |
| Database | PostgreSQL 16 + pgvector extension |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| LLM | Anthropic `claude-sonnet-4-20250514` |
| PDF parsing | PyMuPDF (`fitz`) |
| Frontend | React 18, Vite, TypeScript |
| Infra | Docker Compose |

---

## Quickstart

### Prerequisites

- Docker + Docker Compose
- OpenAI API key
- Anthropic API key

### 1. Clone and configure

```bash
git clone <repo-url>
cd investment-knowledge-engine

cp .env.example .env
```

`.env` requires:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/investment_knowledge
```


### 2. Start the full stack

```bash
docker-compose up
```

On first run this will:
1. Pull the `pgvector/pgvector:pg16` image and start Postgres
2. Build the FastAPI backend image and run Alembic migrations
3. Build the React frontend

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |

### 3. Upload a document and ask a question

1. Open http://localhost:5173
2. Enter a company name (e.g. `Acme Corp`)
3. Go to **Upload** — drag in a PDF annual report
4. Go to **Ask** — type a question like *"What was revenue growth in FY2023?"*
5. Go to **Memo** — generate a bull case, bear case, or full investment thesis

---

## Project structure

```
app/
├── main.py                  # FastAPI app, CORS, router registration
├── config.py                # Settings via pydantic-settings
├── db.py                    # Async SQLAlchemy engine + session factory
├── models/
│   ├── document.py          # Document ORM model
│   └── chunk.py             # Chunk ORM model (stores text + VECTOR(1536))
├── schemas/
│   ├── document.py          # Upload response schema
│   ├── query.py             # Query request/response schemas
│   └── memo.py              # Memo request/response schemas
├── services/
│   ├── ingestion/
│   │   ├── parser.py        # PDF → raw text (PyMuPDF)
│   │   ├── chunker.py       # Text → overlapping chunks
│   │   └── embedder.py      # Chunks → OpenAI embeddings
│   ├── retrieval.py         # pgvector search + MMR re-rank
│   ├── qa.py                # Context assembly + Claude completion
│   └── memo.py              # Memo generation with prompt variants
├── api/
│   ├── upload.py            # POST /api/upload
│   ├── query.py             # POST /api/query
│   ├── memo.py              # POST /api/memo
│   ├── documents.py         # GET /api/documents, DELETE /api/documents/{id}
│   └── companies.py         # GET /api/companies
└── prompts/
    ├── qa_system.txt        # System prompt for QA (grounding + citation rules)
    └── memo_system.txt      # System prompt for memo generation
```

## API reference

### `POST /api/upload`

Upload a PDF document.

**Form data:** `file` (PDF), `company` (string)

**Response:**
```json
{
  "document_id": 1,
  "filename": "acme_annual_report_2023.pdf",
  "company": "Acme Corp",
  "chunk_count": 142,
  "status": "indexed"
}
```

### `POST /api/query`

Ask a question against a company's document corpus.

**Body:**
```json
{ "question": "What was EBITDA in FY2023?", "company": "Acme Corp" }
```

**Response:**
```json
{
  "answer": "EBITDA for FY2023 was $42m, up 18% year-on-year.",
  "sources": ["acme_annual_report_2023.pdf, p.34"],
  "chunk_ids": [88, 91, 95, 102, 107]
}
```

### `POST /api/memo`

Generate an investment memo.

**Body:**
```json
{
  "company": "Acme Corp",
  "memo_type": "bull_case"
}
```

`memo_type` options: `bull_case`, `bear_case`, `full_thesis`

**Response:**
```json
{
  "title": "Acme Corp — Bull Case",
  "company": "Acme Corp",
  "memo_type": "bull_case",
  "content": "...",
  "generated_at": "2026-03-12T10:00:00Z"
}
```

### `GET /api/documents`

List all documents. Optional query param: `?company=Acme+Corp`

### `DELETE /api/documents/{id}`

Delete a document and all its associated chunks.

---

## Running tests

```bash
# Inside the backend container
docker-compose exec backend pytest tests/ -v

# Or locally (requires a running Postgres with pgvector)
pytest tests/ -v
```

---

## Development

```bash
# Rebuild and restart a single service after code changes
docker-compose up --build backend
docker-compose up --build frontend

# Apply a new database migration
docker-compose exec backend alembic upgrade head

# Auto-generate a migration from model changes
docker-compose exec backend alembic revision --autogenerate -m "add index to chunks"
```
