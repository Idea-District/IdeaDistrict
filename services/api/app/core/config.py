from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every setting comes from the environment (or .env). Nothing secret in code."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Idea District API"
    database_url: str = "sqlite:///./idea_district.db"

    # AI: one provider behind one client. See app/services/ai/client.py.
    ai_provider: str = "mock"
    ai_api_key: str = ""
    ai_base_url: str = ""

    # Discovery shape is configuration, not code (decision: 5 situations).
    situations_per_session: int = 5

    cors_origins: str = "http://localhost:3100,http://localhost:8081"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
