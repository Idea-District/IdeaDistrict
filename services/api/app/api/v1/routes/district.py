import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter
from pydantic import Field

from app.api.deps import DB
from app.schemas.demo import FounderRef
from app.services import district, interactions
from app.services.founders import get_founder

router = APIRouter(prefix="/district", tags=["district"])


class VisitIn(FounderRef):
    spot: Literal["id", "journey", "business", "needs", "progress", "capabilities", "unknowns", "lens"]


@router.post("/visit")
def visit(data: VisitIn, db: DB) -> dict:
    """The 3D District: the founder flew over to a building (or changed whose eyes they see it through)."""
    founder = get_founder(db, data.founder_id)
    interactions.record(db, "district_spot_visited", user_id=founder.id, spot=data.spot)
    db.commit()
    return {"ok": True}


class JourneyIn(FounderRef):
    kind: Literal["milestone", "decision"]
    title: str = Field(min_length=2, max_length=200)
    on: date
    learned: str = Field(default="", max_length=1500)


class BusinessIn(FounderRef):
    field: Literal["project", "stage", "problem", "constraint", "trajectory"]
    value: str = Field(min_length=2, max_length=300)


class NeedIn(FounderRef):
    kind: Literal["need", "goal", "offer"]
    value: str = Field(min_length=2, max_length=300)


class ExperimentIn(FounderRef):
    title: str = Field(min_length=2, max_length=200)
    tried: str = Field(min_length=2, max_length=1500)
    started_on: date


class ExperimentUpdate(FounderRef):
    happened: str | None = Field(default=None, max_length=1500)
    learned: str | None = Field(default=None, max_length=1500)
    status: Literal["running", "done", "stopped"] | None = None
    ended_on: date | None = None


class VisibilityIn(FounderRef):
    room: Literal["journey", "business", "needs", "progress", "capabilities"]
    audience: Literal["private", "connections", "community"]


@router.get("")
def overview(founder_id: uuid.UUID, db: DB) -> dict:
    return district.overview(db, get_founder(db, founder_id))


@router.get("/journey")
def journey(founder_id: uuid.UUID, db: DB) -> list[dict]:
    return district.journey(db, get_founder(db, founder_id))


@router.post("/journey")
def add_journey(data: JourneyIn, db: DB) -> list[dict]:
    return district.add_journey(db, get_founder(db, data.founder_id), data.kind, data.title, data.on, data.learned)


@router.delete("/journey/{entry_id}")
def delete_journey(entry_id: uuid.UUID, founder_id: uuid.UUID, db: DB) -> list[dict]:
    return district.delete_journey(db, get_founder(db, founder_id), entry_id)


@router.get("/business")
def business(founder_id: uuid.UUID, db: DB) -> dict:
    return district.business(db, get_founder(db, founder_id))


@router.post("/business")
def set_business(data: BusinessIn, db: DB) -> dict:
    return district.set_business(db, get_founder(db, data.founder_id), data.field, data.value)


@router.get("/needs")
def needs(founder_id: uuid.UUID, db: DB) -> dict:
    return district.needs(db, get_founder(db, founder_id))


@router.post("/needs")
def add_need(data: NeedIn, db: DB) -> dict:
    return district.add_need(db, get_founder(db, data.founder_id), data.kind, data.value)


@router.delete("/state/{state_id}")
def remove_state(state_id: uuid.UUID, founder_id: uuid.UUID, db: DB) -> dict:
    return district.remove_state(db, get_founder(db, founder_id), state_id)


@router.get("/experiments")
def experiments(founder_id: uuid.UUID, db: DB) -> list[dict]:
    return district.experiments(db, get_founder(db, founder_id))


@router.post("/experiments")
def add_experiment(data: ExperimentIn, db: DB) -> list[dict]:
    return district.add_experiment(db, get_founder(db, data.founder_id), data.title, data.tried, data.started_on)


@router.post("/experiments/{exp_id}")
def update_experiment(exp_id: uuid.UUID, data: ExperimentUpdate, db: DB) -> list[dict]:
    return district.update_experiment(db, get_founder(db, data.founder_id), exp_id, data.happened, data.learned, data.status, data.ended_on)


@router.get("/capabilities")
def capabilities(founder_id: uuid.UUID, db: DB) -> list[dict]:
    return district.capabilities(db, get_founder(db, founder_id))


@router.get("/visibility")
def get_visibility(founder_id: uuid.UUID, db: DB) -> dict:
    return district.visibility_out(db, get_founder(db, founder_id))


@router.post("/visibility")
def set_visibility(data: VisibilityIn, db: DB) -> dict:
    return district.set_visibility(db, get_founder(db, data.founder_id), data.room, data.audience)


class InvestorRoomIn(FounderRef):
    room: Literal["journey", "business", "needs", "progress", "capabilities"]
    on: bool


@router.post("/visibility/investors")
def set_investor_room(data: InvestorRoomIn, db: DB) -> dict:
    return district.set_investor_room(db, get_founder(db, data.founder_id), data.room, data.on)
