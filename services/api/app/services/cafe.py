"""The District Cafe: Daily Brew, Open Table and What's On.

Founder actions are written to `interactions`. Team content comes from the admin console.
Hidden answers and posts (moderation) are never returned to founders.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import iso, utcnow
from app.models import (
    Brew,
    BrewAnswer,
    BrewHelpful,
    CafeTable,
    IdState,
    Interaction,
    TablePost,
    TableSeat,
    User,
    WhatsOn,
    WhatsOnSave,
)
from app.services import interactions
from app.services.ai.client import AIClient
from app.services.errors import Conflict, NotFound

# ── Helpers ─────────────────────────────────────────────────────────────


def cafe_today() -> date:
    return datetime.now(ZoneInfo(get_settings().cafe_timezone)).date()


def _utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def _person(db: Session, user: User) -> dict:
    """What any member may see about another: name, initial and what they are building."""
    building = db.scalar(
        select(IdState.value)
        .where(IdState.user_id == user.id, IdState.field == "project", IdState.facet == "primary")
        .order_by(IdState.created_at.desc())
        .limit(1)
    )
    return {"id": str(user.id), "name": user.name, "building": building or user.organisation or ""}


# ── Daily Brew ──────────────────────────────────────────────────────────


def todays_brew(db: Session) -> Brew | None:
    return db.scalar(select(Brew).where(Brew.publish_on <= cafe_today()).order_by(Brew.publish_on.desc()).limit(1))


def _brew_out(db: Session, brew: Brew, founder_id: uuid.UUID) -> dict:
    count = db.scalar(
        select(func.count()).select_from(BrewAnswer).where(BrewAnswer.brew_id == brew.id, BrewAnswer.hidden_at.is_(None))
    )
    mine = db.scalar(select(BrewAnswer).where(BrewAnswer.brew_id == brew.id, BrewAnswer.user_id == founder_id))
    return {
        "id": str(brew.id),
        "question": brew.question,
        "publish_on": brew.publish_on.isoformat(),
        "answer_count": count or 0,
        "my_answer": None if mine is None else {"body": mine.body, "save_to_journey": mine.save_to_journey},
    }


def get_brew(db: Session, founder_id: uuid.UUID) -> dict | None:
    brew = todays_brew(db)
    return None if brew is None else _brew_out(db, brew, founder_id)


def answer_brew(db: Session, founder: User, brew_id: uuid.UUID, body: str, save_to_journey: bool) -> dict:
    brew = db.get(Brew, brew_id)
    if brew is None:
        raise NotFound("That Daily Brew no longer exists.")
    if brew.publish_on > cafe_today():
        raise Conflict("That Daily Brew isn't open yet.")
    answer = db.scalar(select(BrewAnswer).where(BrewAnswer.brew_id == brew.id, BrewAnswer.user_id == founder.id))
    if answer is None:
        answer = BrewAnswer(brew_id=brew.id, user_id=founder.id, body=body.strip(), save_to_journey=save_to_journey)
        db.add(answer)
        event = "brew_answer"
    else:
        answer.body = body.strip()
        answer.save_to_journey = save_to_journey
        event = "brew_answer_edit"
    db.flush()
    interactions.record(db, event, user_id=founder.id, entity_type="brew_answer", entity_id=answer.id, save_to_journey=save_to_journey)
    db.commit()
    return _brew_out(db, brew, founder.id)


def brew_answers(db: Session, founder_id: uuid.UUID, brew_id: uuid.UUID) -> list[dict]:
    if db.get(Brew, brew_id) is None:
        raise NotFound("That Daily Brew no longer exists.")
    answers = list(
        db.scalars(
            select(BrewAnswer)
            .where(BrewAnswer.brew_id == brew_id, BrewAnswer.hidden_at.is_(None))
            .order_by(BrewAnswer.created_at.desc())
        )
    )
    out = []
    for a in answers:
        helpful = db.scalar(select(func.count()).select_from(BrewHelpful).where(BrewHelpful.answer_id == a.id)) or 0
        by_me = db.scalar(select(BrewHelpful.id).where(BrewHelpful.answer_id == a.id, BrewHelpful.user_id == founder_id))
        out.append(
            {
                "id": str(a.id),
                "body": a.body,
                "author": _person(db, db.get(User, a.user_id)),
                "mine": a.user_id == founder_id,
                "helpful_count": helpful,
                "helpful_by_me": by_me is not None,
                "posted_at": iso(a.created_at),
            }
        )
    return out


def mark_helpful(db: Session, founder: User, answer_id: uuid.UUID, on: bool) -> dict:
    answer = db.get(BrewAnswer, answer_id)
    if answer is None or answer.hidden_at is not None:
        raise NotFound("That answer is no longer here.")
    row = db.scalar(select(BrewHelpful).where(BrewHelpful.answer_id == answer_id, BrewHelpful.user_id == founder.id))
    if on and row is None and answer.user_id != founder.id:
        db.add(BrewHelpful(answer_id=answer_id, user_id=founder.id))
    elif not on and row is not None:
        db.delete(row)
    interactions.record(db, "brew_helpful" if on else "brew_unhelpful", user_id=founder.id, entity_type="brew_answer", entity_id=answer_id)
    db.commit()
    count = db.scalar(select(func.count()).select_from(BrewHelpful).where(BrewHelpful.answer_id == answer_id)) or 0
    return {"helpful_count": count, "helpful_by_me": on and answer.user_id != founder.id}


# ── Open Table ──────────────────────────────────────────────────────────


def table_status(t: CafeTable) -> str:
    """A scheduled table opens by itself once its start time has passed."""
    if t.status == "scheduled" and t.starts_at is not None and _utc(t.starts_at) <= utcnow():
        return "open"
    return t.status


def _seated(db: Session, table_id: uuid.UUID) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .join(TableSeat, TableSeat.user_id == User.id)
            .where(TableSeat.table_id == table_id, TableSeat.left_at.is_(None))
            .order_by(TableSeat.created_at)
        )
    )


def _seat(db: Session, table_id: uuid.UUID, user_id: uuid.UUID) -> TableSeat | None:
    return db.scalar(select(TableSeat).where(TableSeat.table_id == table_id, TableSeat.user_id == user_id))


def _table_out(db: Session, t: CafeTable, founder_id: uuid.UUID) -> dict:
    seat = _seat(db, t.id, founder_id)
    posts = db.scalar(select(func.count()).select_from(TablePost).where(TablePost.table_id == t.id, TablePost.hidden_at.is_(None))) or 0
    starts = _utc(t.starts_at)
    return {
        "id": str(t.id),
        "title": t.title,
        "prompt": t.prompt,
        "status": table_status(t),
        "starts_at": iso(starts) if starts else None,
        "seated_count": len(_seated(db, t.id)),
        "post_count": posts,
        "joined": seat is not None and seat.left_at is None,
    }


def list_tables(db: Session, founder_id: uuid.UUID) -> list[dict]:
    order = {"open": 0, "scheduled": 1}
    tables = list(db.scalars(select(CafeTable).where(CafeTable.status != "closed").order_by(CafeTable.created_at)))
    tables.sort(key=lambda t: (order.get(table_status(t), 2), _utc(t.starts_at) or utcnow()))
    return [_table_out(db, t, founder_id) for t in tables]


def _open_table(db: Session, table_id: uuid.UUID) -> CafeTable:
    t = db.get(CafeTable, table_id)
    if t is None or t.status == "closed":
        raise NotFound("That table has closed.")
    return t


def table_detail(db: Session, founder_id: uuid.UUID, table_id: uuid.UUID) -> dict:
    t = _open_table(db, table_id)
    posts = list(
        db.scalars(
            select(TablePost).where(TablePost.table_id == t.id, TablePost.hidden_at.is_(None)).order_by(TablePost.created_at)
        )
    )
    return {
        **_table_out(db, t, founder_id),
        "seated": [_person(db, u) for u in _seated(db, t.id)],
        "posts": [
            {
                "id": str(p.id),
                "body": p.body,
                "author": _person(db, db.get(User, p.user_id)),
                "mine": p.user_id == founder_id,
                "posted_at": iso(p.created_at),
            }
            for p in posts
        ],
    }


def join_table(db: Session, founder: User, table_id: uuid.UUID) -> dict:
    t = _open_table(db, table_id)
    seat = _seat(db, t.id, founder.id)
    if seat is None:
        db.add(TableSeat(table_id=t.id, user_id=founder.id))
    else:
        seat.left_at = None
    interactions.record(db, "table_join", user_id=founder.id, entity_type="cafe_table", entity_id=t.id)
    db.commit()
    return table_detail(db, founder.id, t.id)


def leave_table(db: Session, founder: User, table_id: uuid.UUID) -> dict:
    t = _open_table(db, table_id)
    seat = _seat(db, t.id, founder.id)
    if seat is not None and seat.left_at is None:
        seat.left_at = utcnow()
    interactions.record(db, "table_leave", user_id=founder.id, entity_type="cafe_table", entity_id=t.id)
    db.commit()
    return _table_out(db, t, founder.id)


def post_to_table(db: Session, founder: User, table_id: uuid.UUID, body: str) -> dict:
    t = _open_table(db, table_id)
    if table_status(t) != "open":
        raise Conflict("This table opens at its start time.")
    seat = _seat(db, t.id, founder.id)
    if seat is None:
        db.add(TableSeat(table_id=t.id, user_id=founder.id))
    elif seat.left_at is not None:
        seat.left_at = None
    post = TablePost(table_id=t.id, user_id=founder.id, body=body.strip())
    db.add(post)
    db.flush()
    interactions.record(db, "table_post", user_id=founder.id, entity_type="table_post", entity_id=post.id)
    db.commit()
    return table_detail(db, founder.id, t.id)


# ── What's On ───────────────────────────────────────────────────────────


def _item_out(db: Session, w: WhatsOn, founder_id: uuid.UUID | None) -> dict:
    saved = False
    if founder_id is not None:
        saved = db.scalar(select(WhatsOnSave.id).where(WhatsOnSave.item_id == w.id, WhatsOnSave.user_id == founder_id)) is not None
    starts = _utc(w.starts_at)
    return {
        "id": str(w.id),
        "kind": w.kind,
        "title": w.title,
        "detail": w.detail,
        "starts_at": iso(starts) if starts else None,
        "place": w.place,
        "table_id": str(w.table_id) if w.table_id else None,
        "saved": saved,
    }


def whats_on(db: Session, founder_id: uuid.UUID | None) -> list[dict]:
    """Current items: not archived, and not an event that ended more than a day ago."""
    cutoff = utcnow() - timedelta(days=1)
    items = [
        w
        for w in db.scalars(select(WhatsOn).where(WhatsOn.archived_at.is_(None)).order_by(WhatsOn.created_at.desc()))
        if w.starts_at is None or _utc(w.starts_at) >= cutoff
    ]
    kind_order = {"event": 0, "open_call": 1, "table": 2}
    items.sort(key=lambda w: (kind_order.get(w.kind, 3), _utc(w.starts_at) or utcnow()))
    return [_item_out(db, w, founder_id) for w in items]


def save_item(db: Session, founder: User, item_id: uuid.UUID, on: bool) -> dict:
    w = db.get(WhatsOn, item_id)
    if w is None or w.archived_at is not None:
        raise NotFound("That item is no longer on.")
    row = db.scalar(select(WhatsOnSave).where(WhatsOnSave.item_id == item_id, WhatsOnSave.user_id == founder.id))
    if on and row is None:
        db.add(WhatsOnSave(item_id=item_id, user_id=founder.id))
    elif not on and row is not None:
        db.delete(row)
    interactions.record(db, "whats_on_save" if on else "whats_on_unsave", user_id=founder.id, entity_type="whats_on", entity_id=item_id)
    db.commit()
    return _item_out(db, w, founder.id)


# ── The Cafe home ───────────────────────────────────────────────────────


def founders_here_today(db: Session) -> int:
    """Distinct members who did anything today (Cafe time). A quiet number, never a leaderboard."""
    tz = ZoneInfo(get_settings().cafe_timezone)
    start = datetime.combine(cafe_today(), datetime.min.time(), tzinfo=tz).astimezone(UTC)
    return db.scalar(
        select(func.count(func.distinct(Interaction.user_id))).where(Interaction.created_at >= start, Interaction.user_id.is_not(None))
    ) or 0


def home(db: Session, founder: User) -> dict:
    tables = list_tables(db, founder.id)
    return {
        "brew": get_brew(db, founder.id),
        "tables_open": sum(1 for t in tables if t["status"] == "open"),
        "next_table": next((t for t in tables if t["status"] == "scheduled"), None),
        "whats_on": whats_on(db, founder.id)[:3],
        "here_today": founders_here_today(db),
    }


# ── Admin (the team's console) ──────────────────────────────────────────

DRAFT_SCHEMA = {
    "type": "object",
    "required": ["questions"],
    "properties": {"questions": {"type": "array", "items": {"type": "string"}, "minItems": 1, "maxItems": 7}},
}


def admin_overview(db: Session) -> dict:
    today = cafe_today()
    brews = list(db.scalars(select(Brew).where(Brew.publish_on >= today - timedelta(days=7)).order_by(Brew.publish_on)))
    tables = list(db.scalars(select(CafeTable).order_by(CafeTable.created_at.desc())))
    items = list(db.scalars(select(WhatsOn).where(WhatsOn.archived_at.is_(None)).order_by(WhatsOn.created_at.desc())))
    return {
        "today": today.isoformat(),
        "brews": [
            {
                "id": str(b.id),
                "question": b.question,
                "publish_on": b.publish_on.isoformat(),
                "drafted_by_ai": b.drafted_by_ai,
                "answer_count": db.scalar(select(func.count()).select_from(BrewAnswer).where(BrewAnswer.brew_id == b.id)) or 0,
            }
            for b in brews
        ],
        "tables": [{**_table_out(db, t, uuid.UUID(int=0))} for t in tables],
        "whats_on": [_item_out(db, w, None) for w in items],
        "recent": recent_posts(db),
    }


def next_free_day(db: Session, start: date) -> date:
    taken = set(db.scalars(select(Brew.publish_on).where(Brew.publish_on >= start)))
    day = start
    while day in taken:
        day += timedelta(days=1)
    return day


def add_brew(db: Session, question: str, publish_on: date | None, drafted_by_ai: bool = False) -> Brew:
    day = publish_on or next_free_day(db, cafe_today())
    if db.scalar(select(Brew.id).where(Brew.publish_on == day)):
        raise Conflict(f"There is already a Daily Brew on {day.isoformat()}.")
    brew = Brew(question=question.strip(), publish_on=day, drafted_by_ai=drafted_by_ai)
    db.add(brew)
    interactions.record(db, "admin_brew_add", entity_type="brew")
    db.commit()
    return brew


def delete_brew(db: Session, brew_id: uuid.UUID) -> None:
    brew = db.get(Brew, brew_id)
    if brew is None:
        raise NotFound("No such Daily Brew.")
    if brew.publish_on <= cafe_today():
        raise Conflict("A brew that has already gone out can't be deleted; hide its answers instead.")
    db.delete(brew)
    db.commit()


def draft_brews(db: Session, ai: AIClient, count: int, theme: str) -> list[str]:
    """AI drafts; the team approves each one before it is scheduled. Nothing is published here."""
    recent = list(db.scalars(select(Brew.question).order_by(Brew.publish_on.desc()).limit(14)))
    data = ai.run(
        purpose="draft_brews",
        prompt_key="draft_brews",
        variables={"how_many": str(count), "theme": theme or "(any)", "recent_questions_to_avoid": " | ".join(recent) or "(none)"},
        schema=DRAFT_SCHEMA,
        max_output_tokens=700,
    )
    return [q.strip() for q in data["questions"] if q.strip()][:count]


def add_table(db: Session, title: str, prompt: str, starts_at: datetime | None) -> CafeTable:
    status = "scheduled" if starts_at and _utc(starts_at) > utcnow() else "open"
    t = CafeTable(title=title.strip(), prompt=prompt.strip(), status=status, starts_at=starts_at)
    db.add(t)
    interactions.record(db, "admin_table_add", entity_type="cafe_table")
    db.commit()
    return t


def set_table_status(db: Session, table_id: uuid.UUID, status: str) -> None:
    t = db.get(CafeTable, table_id)
    if t is None:
        raise NotFound("No such table.")
    t.status = status
    db.commit()


def add_whats_on(db: Session, kind: str, title: str, detail: str, starts_at: datetime | None, place: str | None) -> WhatsOn:
    w = WhatsOn(kind=kind, title=title.strip(), detail=detail.strip(), starts_at=starts_at, place=(place or "").strip() or None)
    db.add(w)
    db.commit()
    return w


def archive_whats_on(db: Session, item_id: uuid.UUID) -> None:
    w = db.get(WhatsOn, item_id)
    if w is None:
        raise NotFound("No such item.")
    w.archived_at = utcnow()
    db.commit()


def recent_posts(db: Session, limit: int = 30) -> list[dict]:
    """Latest answers and table posts, for moderation."""
    answers = db.scalars(select(BrewAnswer).order_by(BrewAnswer.created_at.desc()).limit(limit))
    posts = db.scalars(select(TablePost).order_by(TablePost.created_at.desc()).limit(limit))
    rows = [
        {"kind": "answer", "id": str(a.id), "body": a.body, "author": db.get(User, a.user_id).name, "hidden": a.hidden_at is not None, "posted_at": iso(a.created_at)}
        for a in answers
    ] + [
        {"kind": "post", "id": str(p.id), "body": p.body, "author": db.get(User, p.user_id).name, "hidden": p.hidden_at is not None, "posted_at": iso(p.created_at)}
        for p in posts
    ]
    rows.sort(key=lambda r: r["posted_at"], reverse=True)
    return rows[:limit]


def set_hidden(db: Session, kind: str, item_id: uuid.UUID, hidden: bool) -> None:
    model = BrewAnswer if kind == "answer" else TablePost
    row = db.get(model, item_id)
    if row is None:
        raise NotFound("Nothing to moderate with that id.")
    row.hidden_at = utcnow() if hidden else None
    interactions.record(db, "admin_hide" if hidden else "admin_unhide", entity_type=kind, entity_id=item_id)
    db.commit()
