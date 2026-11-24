from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.deps import AI, DB
from app.schemas.demo import FounderRef
from app.services import ask_id
from app.services.founders import get_founder

router = APIRouter(prefix="/ask", tags=["ask"])


class Turn(BaseModel):
    role: Literal["founder", "id"]
    text: str = Field(max_length=2000)


class AskIn(FounderRef):
    message: str = Field(min_length=2, max_length=1500)
    history: list[Turn] = Field(default_factory=list, max_length=20)


class AskOut(BaseModel):
    reply: str
    rests_on: str
    strength: Literal["low", "medium", "high"]
    suggestions: list[str]


@router.post("", response_model=AskOut)
def ask(data: AskIn, db: DB, ai: AI) -> AskOut:
    founder = get_founder(db, data.founder_id)
    return AskOut(**ask_id.ask(db, ai, founder, data.message, [t.model_dump() for t in data.history]))
