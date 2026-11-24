import uuid
from typing import Literal

from fastapi import APIRouter
from pydantic import Field

from app.api.deps import DB
from app.schemas.demo import FounderRef
from app.services import me
from app.services.founders import get_founder

router = APIRouter(prefix="/me", tags=["me"])


class ProfileIn(FounderRef):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    one_line: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=80)


class AvatarIn(FounderRef):
    role: str
    personality: str
    style: str
    colour: str


class DeleteIn(FounderRef):
    confirm: Literal["DELETE"]


@router.get("")
def profile(founder_id: uuid.UUID, db: DB) -> dict:
    return me.profile(db, get_founder(db, founder_id))


@router.post("")
def update(data: ProfileIn, db: DB) -> dict:
    return me.update_profile(db, get_founder(db, data.founder_id), data.name, data.one_line, data.city)


@router.post("/avatar")
def avatar(data: AvatarIn, db: DB) -> dict:
    return me.set_avatar(db, get_founder(db, data.founder_id), data.model_dump())


@router.get("/export")
def export(founder_id: uuid.UUID, db: DB) -> dict:
    return me.export(db, get_founder(db, founder_id))


@router.post("/delete")
def delete(data: DeleteIn, db: DB) -> dict:
    me.delete_account(db, get_founder(db, data.founder_id))
    return {"ok": True}
