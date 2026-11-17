from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_service_name: str = "jobcrawler-python-ai-service"
    ai_service_env: str = "development"
    ai_service_api_key: str = ""
    max_upload_mb: int = 8

    # ── NVIDIA NIM (primary ATS AI provider) ─────────────────────────────
    nvidia_nim_api_key: str = ""
    nvidia_nim_model: str = ""          # e.g. exact Nemotron 3 Ultra id on your account
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"
    nim_timeout_s: int = 60
    nim_max_retries: int = 3

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()