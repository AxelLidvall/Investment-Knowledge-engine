"""
Shared fixtures for the test suite.

Env vars must be set before importing anything from `app`, because
pydantic-settings reads them at module load time via `settings = Settings()`.
"""
import os

os.environ.setdefault("ANTHROPIC_API_KEY", "test-anthropic-key")
os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def sample_pages() -> list[dict]:
    return [
        {"page_num": 1, "text": "Acme Corp annual revenue grew 20% to $500M in FY2023."},
        {"page_num": 2, "text": "The company operates in 15 countries with 2,000 employees."},
    ]


@pytest.fixture
def sample_chunks() -> list[dict]:
    return [
        {
            "page_num": 1,
            "chunk_index": 0,
            "text": "Acme Corp annual revenue grew 20% to $500M in FY2023.",
        },
        {
            "page_num": 2,
            "chunk_index": 1,
            "text": "The company operates in 15 countries with 2,000 employees.",
        },
    ]


@pytest.fixture
async def async_client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client
