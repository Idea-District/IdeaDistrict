import uuid

from fastapi import APIRouter

from app.api.deps import AI, DB
from app.schemas.demo import MatchOut, NoMatchOut, RespondIn
from app.services import matching
from app.services.founders import get_founder

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=MatchOut | NoMatchOut)
def recommendation(founder_id: uuid.UUID, db: DB, ai: AI) -> MatchOut | NoMatchOut:
    return matching.recommend(db, ai, get_founder(db, founder_id))


@router.post("/{recommendation_id}/respond")
def respond(recommendation_id: uuid.UUID, data: RespondIn, db: DB) -> dict:
    matching.respond(db, recommendation_id, data)
    return {"ok": True}
