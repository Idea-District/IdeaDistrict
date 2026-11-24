"""The team writes and archives Explore industries reads."""

import json
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import iso, utcnow
from app.models import IndustryTopic
from app.services.errors import Conflict, NotFound


def slugify(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80]


def list_all(db: Session) -> list[dict]:
    rows = db.scalars(select(IndustryTopic).order_by(IndustryTopic.created_at.desc()))
    return [{"slug": t.slug, "title": t.title, "category": t.category, "minutes": t.minutes, "tags": t.tags,
             "archived": t.archived_at is not None, "created_at": iso(t.created_at)} for t in rows]


def add(db: Session, data: dict) -> dict:
    slug = slugify(data["title"])
    if db.scalar(select(IndustryTopic.id).where(IndustryTopic.slug == slug)):
        raise Conflict("A read with that title already exists.")
    t = IndustryTopic(
        slug=slug, title=data["title"].strip(), category=data["category"], minutes=data["minutes"], summary=data["summary"].strip(),
        sections_json=json.dumps(data["sections"]), questions_json=json.dumps([q.strip() for q in data["questions"] if q.strip()]),
        tags=data["tags"].strip(),
    )
    db.add(t)
    db.commit()
    return {"slug": t.slug}


def archive(db: Session, slug: str) -> None:
    t = db.scalar(select(IndustryTopic).where(IndustryTopic.slug == slug))
    if t is None:
        raise NotFound("No read with that slug.")
    t.archived_at = utcnow()
    db.commit()
