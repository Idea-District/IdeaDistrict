"""The team's admin console. Every route needs the X-Admin-Token header (ADMIN_TOKEN setting).
Admin is switched off entirely when ADMIN_TOKEN is empty."""

import hmac
import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import AI, DB
from app.core.config import get_settings
from app.services import admin_data, cafe, connect, topics_admin


def require_admin(x_admin_token: Annotated[str | None, Header()] = None) -> None:
    expected = get_settings().admin_token
    if not expected:
        raise HTTPException(status_code=503, detail="The admin console is switched off (no ADMIN_TOKEN set).")
    if not x_admin_token or not hmac.compare_digest(x_admin_token, expected):
        raise HTTPException(status_code=401, detail="That admin token isn't right.")


router = APIRouter(prefix="/admin/cafe", tags=["admin"], dependencies=[Depends(require_admin)])


class BrewIn(BaseModel):
    question: str = Field(min_length=8, max_length=300)
    publish_on: date | None = None  # empty = the next free day
    drafted_by_ai: bool = False


class DraftIn(BaseModel):
    count: int = Field(default=7, ge=1, le=7)
    theme: str = Field(default="", max_length=200)


class TableIn(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    prompt: str = Field(min_length=8, max_length=600)
    starts_at: datetime | None = None


class TableStatusIn(BaseModel):
    status: Literal["open", "scheduled", "closed"]


class WhatsOnIn(BaseModel):
    kind: Literal["event", "open_call", "table"]
    title: str = Field(min_length=3, max_length=160)
    detail: str = Field(default="", max_length=600)
    starts_at: datetime | None = None
    place: str | None = Field(default=None, max_length=160)


class HideIn(BaseModel):
    kind: Literal["answer", "post"]
    id: uuid.UUID
    hidden: bool = True


@router.get("")
def overview(db: DB) -> dict:
    return cafe.admin_overview(db)


@router.post("/brews")
def add_brew(data: BrewIn, db: DB) -> dict:
    b = cafe.add_brew(db, data.question, data.publish_on, data.drafted_by_ai)
    return {"id": str(b.id), "publish_on": b.publish_on.isoformat()}


@router.delete("/brews/{brew_id}")
def delete_brew(brew_id: uuid.UUID, db: DB) -> dict:
    cafe.delete_brew(db, brew_id)
    return {"ok": True}


@router.post("/brews/draft")
def draft(data: DraftIn, db: DB, ai: AI) -> dict:
    return {"questions": cafe.draft_brews(db, ai, data.count, data.theme)}


@router.post("/tables")
def add_table(data: TableIn, db: DB) -> dict:
    t = cafe.add_table(db, data.title, data.prompt, data.starts_at)
    return {"id": str(t.id), "status": t.status}


@router.post("/tables/{table_id}/status")
def table_status(table_id: uuid.UUID, data: TableStatusIn, db: DB) -> dict:
    cafe.set_table_status(db, table_id, data.status)
    return {"ok": True}


@router.post("/whats-on")
def add_whats_on(data: WhatsOnIn, db: DB) -> dict:
    w = cafe.add_whats_on(db, data.kind, data.title, data.detail, data.starts_at, data.place)
    return {"id": str(w.id)}


@router.delete("/whats-on/{item_id}")
def archive_whats_on(item_id: uuid.UUID, db: DB) -> dict:
    cafe.archive_whats_on(db, item_id)
    return {"ok": True}


@router.post("/moderate")
def moderate(data: HideIn, db: DB) -> dict:
    cafe.set_hidden(db, data.kind, data.id, data.hidden)
    return {"ok": True}


# ── Explore industries (reads written by the team) ──────────────────────

topics_router = APIRouter(prefix="/admin/topics", tags=["admin"], dependencies=[Depends(require_admin)])


class Section(BaseModel):
    heading: str = Field(min_length=2, max_length=120)
    body: str = Field(min_length=10, max_length=2000)


class TopicIn(BaseModel):
    title: str = Field(min_length=4, max_length=160)
    category: Literal["market", "business_model"]
    minutes: int = Field(default=3, ge=1, le=15)
    summary: str = Field(min_length=10, max_length=400)
    sections: list[Section] = Field(min_length=1, max_length=8)
    questions: list[str] = Field(default_factory=list, max_length=6)
    tags: str = Field(default="", max_length=300)


@topics_router.get("")
def list_topics(db: DB) -> list[dict]:
    return topics_admin.list_all(db)


@topics_router.post("")
def add_topic(data: TopicIn, db: DB) -> dict:
    return topics_admin.add(db, data.model_dump())


@topics_router.delete("/{slug}")
def archive_topic(slug: str, db: DB) -> dict:
    topics_admin.archive(db, slug)
    return {"ok": True}


# ── Opportunities (posted by the team) ──────────────────────────────────

opps_router = APIRouter(prefix="/admin/opportunities", tags=["admin"], dependencies=[Depends(require_admin)])


class OpportunityAdminIn(BaseModel):
    kind: Literal["pilot_call", "challenge", "problem", "circle"]
    title: str = Field(min_length=4, max_length=200)
    posted_by: str = Field(min_length=2, max_length=160)
    summary: str = Field(min_length=10, max_length=600)
    what_they_need: str = Field(default="", max_length=1500)
    timeline: str = Field(default="", max_length=200)
    how_to_respond: str = Field(default="", max_length=1000)
    tags: str = Field(default="", max_length=300)
    closes_on: date | None = None


@opps_router.get("")
def list_opportunities(db: DB) -> list[dict]:
    return connect.admin_opportunities(db)


@opps_router.post("")
def add_opportunity(data: OpportunityAdminIn, db: DB) -> dict:
    return connect.add_opportunity(db, data.model_dump())


@opps_router.delete("/{opp_id}")
def archive_opportunity(opp_id: uuid.UUID, db: DB) -> dict:
    connect.archive_opportunity(db, opp_id)
    return {"ok": True}


# ── Users & data: everyone in the community, for the team ──────────────

data_router = APIRouter(prefix="/admin/data", tags=["admin"], dependencies=[Depends(require_admin)])


@data_router.get("/summary")
def data_summary(db: DB) -> dict:
    return admin_data.summary(db)


@data_router.get("/founders")
def data_founders(db: DB) -> list[dict]:
    return admin_data.founders(db)


@data_router.get("/founders/{founder_id}")
def data_founder(founder_id: uuid.UUID, db: DB) -> dict:
    return admin_data.founder(db, founder_id)


@data_router.get("/investors")
def data_investors(db: DB) -> list[dict]:
    return admin_data.investors(db)


@data_router.get("/investors/{investor_id}")
def data_investor(investor_id: uuid.UUID, db: DB) -> dict:
    return admin_data.investor(db, investor_id)
