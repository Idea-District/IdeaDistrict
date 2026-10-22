from functools import lru_cache

from pydantic import field_validator
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
    ai_model: str = ""  # empty = the provider's default
    ai_thinking_level: str = "LOW"  # Mila: HIGH | LOW. LOW keeps discovery fast on stage.
    ai_timeout_seconds: float = 30.0

    # Discovery shape is configuration, not code (decision: 5 situations).
    situations_per_session: int = 5
    # "Did that go anywhere?" is asked this many days after an introduction is accepted.
    # Set to 0 for demos so the survey appears straight away.
    outcome_survey_delay_days: int = 12

    cors_origins: str = "http://localhost:3100,http://localhost:8081"

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, url: str) -> str:
        """Hosts (Neon, Render, Supabase) hand out postgres:// or postgresql:// URLs; SQLAlchemy
        needs the driver named. SQLite and already-explicit URLs pass through unchanged."""
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
