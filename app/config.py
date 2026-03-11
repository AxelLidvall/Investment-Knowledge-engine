from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    anthropic_api_key: str
    openai_api_key: str
    database_url: str

    # RAG tuning
    chunk_size: int = 512
    chunk_overlap: int = 128
    retrieval_top_k: int = 8
    retrieval_mmr_k: int = 5

    # Model identifiers
    embedding_model: str = "text-embedding-3-small"
    embedding_dims: int = 1536
    llm_model: str = "claude-sonnet-4-20250514"


settings = Settings()  # type: ignore[call-arg]
