"""Investor web app. No login yet (as for founders): the client keeps the investor id."""

import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.deps import DB
from app.services import investor

router = APIRouter(prefix="/investor", tags=["investor"])


class InvestorRef(BaseModel):
    investor_id: uuid.UUID


class NewInvestor(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    firm: str = Field(min_length=2, max_length=160)


class ThesisIn(InvestorRef):
    firm: str = Field(min_length=2, max_length=160)
    sectors: list[str] = Field(default_factory=list, max_length=12)
    stages: list[str] = Field(default_factory=list, max_length=4)
    cheque: str = Field(default="", max_length=80)
    geography: str = Field(default="", max_length=160)


class RespondIn(InvestorRef):
    accept: bool


class MoveIn(InvestorRef):
    stage: Literal["introduced", "conversation", "diligence", "passed"]
    note: str | None = Field(default=None, max_length=1500)


class PostIn(InvestorRef):
    kind: Literal["pilot_call", "challenge", "problem", "circle"]
    title: str = Field(min_length=4, max_length=200)
    summary: str = Field(min_length=10, max_length=600)
    what_they_need: str = Field(default="", max_length=1500)
    timeline: str = Field(default="", max_length=200)
    how_to_respond: str = Field(default="", max_length=1000)
    tags: str = Field(default="", max_length=300)
    closes_on: date | None = None


@router.get("/demo-accounts")
def demo_accounts(db: DB) -> list[dict]:
    return investor.demo_investors(db)


@router.post("")
def create(data: NewInvestor, db: DB) -> dict:
    return investor.create_investor(db, data.name, data.firm)


@router.get("/home")
def home(investor_id: uuid.UUID, db: DB) -> dict:
    return investor.home(db, investor.get_investor(db, investor_id))


@router.get("/thesis")
def get_thesis(investor_id: uuid.UUID, db: DB) -> dict:
    return investor.thesis(db, investor.get_investor(db, investor_id))


@router.post("/thesis")
def set_thesis(data: ThesisIn, db: DB) -> dict:
    return investor.set_thesis(db, investor.get_investor(db, data.investor_id), data.model_dump())


@router.get("/introductions")
def introductions(investor_id: uuid.UUID, db: DB) -> list[dict]:
    return investor.introductions(db, investor.get_investor(db, investor_id))


@router.post("/introductions/{request_id}/respond")
def respond(request_id: uuid.UUID, data: RespondIn, db: DB) -> dict:
    return investor.respond_intro(db, investor.get_investor(db, data.investor_id), request_id, data.accept)


@router.get("/founders/{founder_id}")
def founder(founder_id: uuid.UUID, investor_id: uuid.UUID, db: DB) -> dict:
    return investor.founder_view(db, investor.get_investor(db, investor_id), founder_id)


@router.get("/pipeline")
def pipeline(investor_id: uuid.UUID, db: DB) -> dict:
    return investor.pipeline(db, investor.get_investor(db, investor_id))


@router.post("/pipeline/{founder_id}")
def move(founder_id: uuid.UUID, data: MoveIn, db: DB) -> dict:
    return investor.move(db, investor.get_investor(db, data.investor_id), founder_id, data.stage, data.note)


@router.get("/insights")
def insights(investor_id: uuid.UUID, db: DB) -> dict:
    investor.get_investor(db, investor_id)
    return investor.insights(db)


@router.get("/opportunities")
def my_opportunities(investor_id: uuid.UUID, db: DB) -> list[dict]:
    return investor.my_opportunities(db, investor.get_investor(db, investor_id))


@router.post("/opportunities")
def post_opportunity(data: PostIn, db: DB) -> dict:
    return investor.post_opportunity(db, investor.get_investor(db, data.investor_id), data.model_dump(exclude={"investor_id"}))
