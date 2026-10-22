from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import AI, DB
from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: DB) -> dict:
    db.execute(text("select 1"))
    settings = get_settings()
    return {
        "status": "ok",
        "database": settings.database_url.split(":", 1)[0],
        "ai_provider": settings.ai_provider,
    }


@router.post("/health/ai")
def health_ai(ai: AI) -> dict:
    """Round-trips one call through the AI client, so ai_calls logging is exercised too."""
    return ai.run(purpose="ping", prompt_key="ping", variables={}, schema={"required": ["ok"]})
