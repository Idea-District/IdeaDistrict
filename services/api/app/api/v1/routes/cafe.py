import uuid
from typing import Literal

from fastapi import APIRouter
from pydantic import Field

from app.api.deps import DB
from app.schemas.demo import FounderRef
from app.services import cafe, interactions
from app.services.founders import get_founder

router = APIRouter(prefix="/cafe", tags=["cafe"])


class AnswerIn(FounderRef):
    body: str = Field(min_length=2, max_length=1200)
    save_to_journey: bool = False


class ToggleIn(FounderRef):
    on: bool


class PostIn(FounderRef):
    body: str = Field(min_length=1, max_length=1200)


@router.get("")
def home(founder_id: uuid.UUID, db: DB) -> dict:
    return cafe.home(db, get_founder(db, founder_id))


class VisitIn(FounderRef):
    spot: Literal["counter", "tables", "notice", "quick", "district"]


@router.post("/visit")
def visit(data: VisitIn, db: DB) -> dict:
    """The 3D Cafe: the founder walked over to a place in the room."""
    founder = get_founder(db, data.founder_id)
    interactions.record(db, "cafe_spot_visited", user_id=founder.id, spot=data.spot)
    db.commit()
    return {"ok": True}


@router.get("/brew")
def todays_brew(founder_id: uuid.UUID, db: DB) -> dict:
    get_founder(db, founder_id)
    return {"brew": cafe.get_brew(db, founder_id)}


@router.post("/brews/{brew_id}/answer")
def answer(brew_id: uuid.UUID, data: AnswerIn, db: DB) -> dict:
    return cafe.answer_brew(db, get_founder(db, data.founder_id), brew_id, data.body, data.save_to_journey)


@router.get("/brews/{brew_id}/answers")
def answers(brew_id: uuid.UUID, founder_id: uuid.UUID, db: DB) -> list[dict]:
    get_founder(db, founder_id)
    return cafe.brew_answers(db, founder_id, brew_id)


@router.post("/answers/{answer_id}/helpful")
def helpful(answer_id: uuid.UUID, data: ToggleIn, db: DB) -> dict:
    return cafe.mark_helpful(db, get_founder(db, data.founder_id), answer_id, data.on)


@router.get("/tables")
def tables(founder_id: uuid.UUID, db: DB) -> list[dict]:
    get_founder(db, founder_id)
    return cafe.list_tables(db, founder_id)


@router.get("/tables/{table_id}")
def table(table_id: uuid.UUID, founder_id: uuid.UUID, db: DB) -> dict:
    get_founder(db, founder_id)
    return cafe.table_detail(db, founder_id, table_id)


@router.post("/tables/{table_id}/join")
def join(table_id: uuid.UUID, data: FounderRef, db: DB) -> dict:
    return cafe.join_table(db, get_founder(db, data.founder_id), table_id)


@router.post("/tables/{table_id}/leave")
def leave(table_id: uuid.UUID, data: FounderRef, db: DB) -> dict:
    return cafe.leave_table(db, get_founder(db, data.founder_id), table_id)


@router.post("/tables/{table_id}/posts")
def post(table_id: uuid.UUID, data: PostIn, db: DB) -> dict:
    return cafe.post_to_table(db, get_founder(db, data.founder_id), table_id, data.body)


@router.get("/whats-on")
def whats_on(founder_id: uuid.UUID, db: DB) -> list[dict]:
    get_founder(db, founder_id)
    return cafe.whats_on(db, founder_id)


@router.post("/whats-on/{item_id}/save")
def save(item_id: uuid.UUID, data: ToggleIn, db: DB) -> dict:
    return cafe.save_item(db, get_founder(db, data.founder_id), item_id, data.on)
