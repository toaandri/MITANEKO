from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8080
    log_level: str = "info"

    mitaneko_api_url: str = "http://localhost:5000/api"
    mitaneko_api_key: str = "changeme"

    database_url: str = "postgresql://mitaneko:mitaneko@localhost:5432/mitaneko"

    jwt_secret: str = "mitaneko_jwt_secret_key_change_in_production"
    jwt_algorithm: str = "HS256"

    redis_url: str = "redis://localhost:6379/0"

    hf_token: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "openai/gpt-4o-mini"

    classifier_model: str = "mitaneko_classifier.pkl"
    sentiment_model: str = "nicolas56/french-sentiment-analysis"
    translation_model: str = "Helsinki-NLP/opus-mt-fr-mg"
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    vision_model: str = "google/vit-base-patch16-224"

    model_cache_dir: str = "./models_cache"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
