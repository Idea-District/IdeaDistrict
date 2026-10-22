import uuid

from fastapi import APIRouter

from app.api.deps import AI, DB
from app.schemas.demo import FounderID, FounderRef, RingsTrueIn, TellMeMoreIn
from app.services import id_builder, privacy
from app.services.founders import get_founder

router = APIRouter(prefix="/id", tags=["id"])


@router.get("", response_model=FounderID)
def read_id(founder_id: uuid.UUID, db: DB) -> FounderID:
    return id_builder.read(db, get_founder(db, founder_id))


@router.post("/build", response_model=FounderID)
def build_id(data: FounderRef, db: DB, ai: AI) -> FounderID:
    return id_builder.build(db, ai, get_founder(db, data.founder_id))


@router.post("/tell-me-more", response_model=FounderID)
def tell_me_more(data: TellMeMoreIn, db: DB, ai: AI) -> FounderID:
    return id_builder.tell_me_more(db, ai, get_founder(db, data.founder_id), data.text)


@router.post("/rings-true")
def rings_true(data: RingsTrueIn, db: DB) -> dict:
    """"Does this ring true?" — the product's core assumption, asked on the ID screen."""
    get_founder(db, data.founder_id)
    privacy.record_rings_true(db, data.founder_id, data.answer)
    return {"ok": True}
