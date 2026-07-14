from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    openai_rewrite_model: str = "gpt-4o-mini"
    openai_generation_model: str = "gpt-4o"

    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "vwo_test_cases"

    embedding_model: str = "BAAI/bge-m3"
    reranker_model: str = "BAAI/bge-reranker-v2-m3"
    embedding_device: str = "cuda"

    top_k_prefetch: int = 50
    top_k_retrieve: int = 20
    top_k_rerank: int = 8

    frontend_origin: str = "http://localhost:5173"


settings = Settings()
