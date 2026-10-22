import uuid

from fastapi import APIRouter

from app.api.deps import DB
from app.schemas.demo import OutcomeIn, OutcomeOut, PendingOutcomeOut
from app.services import outcomes
from app.services.founders import get_founder

router = APIRouter(tags=["outcomes"])


@router.get("/outcomes/pending", response_model=list[PendingOutcomeOut])
def pending_outcomes(founder_id: uuid.UUID, db: DB) -> list[PendingOutcomeOut]:
    get_founder(db, founder_id)
    return outcomes.pending(db, founder_id)


@router.post("/recommendations/{recommendation_id}/outcome", response_model=OutcomeOut)
def report_outcome(recommendation_id: uuid.UUID, data: OutcomeIn, db: DB) -> OutcomeOut:
    return outcomes.report(db, recommendation_id, data)
