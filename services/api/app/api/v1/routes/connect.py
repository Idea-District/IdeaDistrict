import uuid
from typing import Literal

from fastapi import APIRouter
from pydantic import Field

from app.api.deps import AI, DB
from app.schemas.demo import FounderRef
from app.services import connect, interactions
from app.services.founders import get_founder

router = APIRouter(tags=["people"])


class PeopleVisitIn(FounderRef):
    spot: Literal["you", "suggestion", "person", "requests", "harbour"]


@router.post("/people/visit")
def people_visit(data: PeopleVisitIn, db: DB) -> dict:
    """The 3D archipelago: the founder sailed over to a place (never logs whose island it was)."""
    founder = get_founder(db, data.founder_id)
    interactions.record(db, "people_spot_visited", user_id=founder.id, spot=data.spot)
    db.commit()
    return {"ok": True}


class RequestIn(FounderRef):
    to_user_id: uuid.UUID
    note: str = Field(default="", max_length=600)
    origin: Literal["explore", "visitor", "opportunity"] = "visitor"


class RespondIn(FounderRef):
    accept: bool


class OpportunityIn(FounderRef):
    saved: bool | None = None
    interested: bool | None = None
    note: str | None = Field(default=None, max_length=600)


@router.get("/people/explore")
def explore(founder_id: uuid.UUID, db: DB) -> dict:
    return connect.explore(db, get_founder(db, founder_id))


@router.get("/people/{user_id}/district")
def visit(user_id: uuid.UUID, founder_id: uuid.UUID, db: DB) -> dict:
    return connect.visit(db, get_founder(db, founder_id), user_id)


@router.get("/people/{user_id}/meet")
def meet(user_id: uuid.UUID, founder_id: uuid.UUID, db: DB, ai: AI) -> dict:
    return connect.meet(db, ai, get_founder(db, founder_id), user_id)


@router.get("/connections")
def connections(founder_id: uuid.UUID, db: DB) -> dict:
    return connect.connections(db, get_founder(db, founder_id))


@router.post("/connections/requests")
def send_request(data: RequestIn, db: DB) -> dict:
    return connect.request(db, get_founder(db, data.founder_id), data.to_user_id, data.note, data.origin)


@router.post("/connections/requests/{request_id}/respond")
def respond(request_id: uuid.UUID, data: RespondIn, db: DB) -> dict:
    return connect.respond(db, get_founder(db, data.founder_id), request_id, data.accept)


@router.post("/connections/requests/{request_id}/withdraw")
def withdraw(request_id: uuid.UUID, data: FounderRef, db: DB) -> dict:
    return connect.withdraw(db, get_founder(db, data.founder_id), request_id)


@router.get("/opportunities")
def opportunities(founder_id: uuid.UUID, db: DB) -> list[dict]:
    return connect.opportunities(db, get_founder(db, founder_id))


@router.get("/opportunities/{opp_id}")
def opportunity(opp_id: uuid.UUID, founder_id: uuid.UUID, db: DB) -> dict:
    return connect.opportunity(db, get_founder(db, founder_id), opp_id)


@router.post("/opportunities/{opp_id}/respond")
def respond_opportunity(opp_id: uuid.UUID, data: OpportunityIn, db: DB) -> dict:
    return connect.respond_opportunity(db, get_founder(db, data.founder_id), opp_id, data.saved, data.interested, data.note)
