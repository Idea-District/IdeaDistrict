from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.services.ai.client import AIClient
from app.services.ai.providers import get_provider

DB = Annotated[Session, Depends(get_db)]


def get_ai(db: DB) -> AIClient:
    return AIClient(db, get_provider(get_settings()))


AI = Annotated[AIClient, Depends(get_ai)]
