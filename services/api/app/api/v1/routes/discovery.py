import uuid

from fastapi import APIRouter

from app.api.deps import AI, DB
from app.schemas.demo import (
    ChoiceIn,
    ChoiceResult,
    ContextIn,
    FounderRef,
    KnownUnknown,
    SituationView,
)
from app.services import discovery
from app.services.founders import get_founder

router = APIRouter(prefix="/discovery", tags=["discovery"])


@router.post("/context", response_model=KnownUnknown)
def save_context(data: ContextIn, db: DB) -> KnownUnknown:
    return discovery.save_context(db, get_founder(db, data.founder_id), data)


@router.get("/known", response_model=KnownUnknown)
def known(founder_id: uuid.UUID, db: DB) -> KnownUnknown:
    return discovery.known_unknown(db, get_founder(db, founder_id))


@router.post("/sessions", response_model=SituationView)
def start_session(data: FounderRef, db: DB, ai: AI) -> SituationView:
    return discovery.start_session(db, ai, get_founder(db, data.founder_id))


@router.get("/sessions/{session_id}/current", response_model=SituationView)
def current(session_id: uuid.UUID, db: DB) -> SituationView:
    return discovery.current_situation(db, session_id)


@router.post("/sessions/{session_id}/next", response_model=SituationView)
def next_situation(session_id: uuid.UUID, db: DB, ai: AI) -> SituationView:
    return discovery.next_situation(db, ai, None, session_id)


@router.post("/situations/{situation_id}/choice", response_model=ChoiceResult)
def choose(situation_id: uuid.UUID, data: ChoiceIn, db: DB) -> ChoiceResult:
    get_founder(db, data.founder_id)
    return discovery.record_choice(db, situation_id, data)
