import uuid
from typing import Literal

from fastapi import APIRouter
from pydantic import Field

from app.api.deps import AI, DB
from app.schemas.demo import FounderRef
from app.services import toolkit
from app.services.founders import get_founder

router = APIRouter(prefix="/toolkit", tags=["toolkit"])


class SimulateIn(FounderRef):
    assumption: str = Field(min_length=8, max_length=400)


class DecideIn(FounderRef):
    chosen: Literal["A", "B"]
    reflection: str = Field(default="", max_length=1500)
    save_to_journey: bool = False


@router.get("/simulator/suggestions")
def suggestions(founder_id: uuid.UUID, db: DB) -> list[str]:
    return toolkit.suggestions(db, get_founder(db, founder_id))


@router.post("/simulator")
def simulate(data: SimulateIn, db: DB, ai: AI) -> dict:
    return toolkit.simulate(db, ai, get_founder(db, data.founder_id), data.assumption)


@router.get("/simulator")
def history(founder_id: uuid.UUID, db: DB) -> list[dict]:
    return toolkit.history(db, get_founder(db, founder_id))


@router.get("/simulator/{sim_id}")
def get_simulation(sim_id: uuid.UUID, founder_id: uuid.UUID, db: DB) -> dict:
    return toolkit.get_simulation(db, get_founder(db, founder_id), sim_id)


@router.post("/simulator/{sim_id}/decide")
def decide(sim_id: uuid.UUID, data: DecideIn, db: DB) -> dict:
    return toolkit.decide(db, get_founder(db, data.founder_id), sim_id, data.chosen, data.reflection, data.save_to_journey)


@router.get("/industries")
def topics(founder_id: uuid.UUID, db: DB) -> list[dict]:
    return toolkit.topics(db, get_founder(db, founder_id))


@router.get("/industries/{slug}")
def topic(slug: str, founder_id: uuid.UUID, db: DB) -> dict:
    return toolkit.topic(db, get_founder(db, founder_id), slug)
