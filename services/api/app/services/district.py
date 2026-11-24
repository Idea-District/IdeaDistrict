"""A founder's own District: the rooms behind the orbit map.

- Journey: milestones and decisions they record, Daily Brew answers they chose to save,
  and when their ID was built.
- Business and Needs & Aspirations: their current State (id_state). Edits are DECLARED and
  also kept as `state_edit` notes, so the next ID rebuild honours them instead of undoing them.
- Progress: experiments (tried / happened / learned).
- Capabilities: their Person reads (id_attributes), in words, with what each rests on.
- Visibility: who may see each room. Enforced where other members can view a District.
"""

import uuid
from datetime import date

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db.base import iso, utcnow
from app.models import (
    Brew,
    BrewAnswer,
    ContextAnswer,
    Experiment,
    IdState,
    JourneyEntry,
    RoomVisibility,
    User,
)
from app.models.district import AUDIENCES, DEFAULT_AUDIENCE, ROOMS
from app.services import id_builder, interactions, privacy
from app.services.errors import NotFound

NEED_KINDS = ("need", "goal", "offer")
BUSINESS_FIELDS = ("project", "stage", "problem", "constraint", "trajectory")
FIELD_LABEL = {
    "project": "What you're building", "stage": "Stage", "problem": "Hardest part right now",
    "constraint": "Constraint", "trajectory": "Where it's heading", "need": "Need", "goal": "Aspiration", "offer": "What you can offer",
}


def _note(db: Session, founder_id: uuid.UUID, text: str) -> None:
    db.add(ContextAnswer(user_id=founder_id, question_key="state_edit", answer_text=text))


def _state(db: Session, founder_id: uuid.UUID) -> list[IdState]:
    return list(
        db.scalars(
            select(IdState).where(IdState.user_id == founder_id, IdState.superseded_at.is_(None)).order_by(IdState.created_at)
        )
    )


def _state_out(s: IdState) -> dict:
    return {"id": str(s.id), "field": s.field, "label": FIELD_LABEL.get(s.field, s.field.capitalize()), "value": s.value,
            "source": s.source, "facet": s.facet, "updated_at": iso(s.created_at)}


# ── Visibility ──────────────────────────────────────────────────────────


def visibility(db: Session, founder_id: uuid.UUID) -> dict[str, str]:
    rows = {r.room: r.audience for r in db.scalars(select(RoomVisibility).where(RoomVisibility.user_id == founder_id))}
    return {room: rows.get(room, DEFAULT_AUDIENCE[room]) for room in ROOMS}


def set_visibility(db: Session, founder: User, room: str, audience: str) -> dict:
    if room not in ROOMS or audience not in AUDIENCES:
        raise NotFound("Unknown room or audience.")
    row = db.scalar(select(RoomVisibility).where(RoomVisibility.user_id == founder.id, RoomVisibility.room == room))
    if row is None:
        db.add(RoomVisibility(user_id=founder.id, room=room, audience=audience))
    else:
        row.audience = audience
    interactions.record(db, "room_visibility", user_id=founder.id, room=room, audience=audience)
    db.commit()
    return visibility_out(db, founder)


def investor_rooms(db: Session, founder_id: uuid.UUID) -> list[str]:
    """Rooms ticked for investors. Shown to investors only while the founder is opted in."""
    return [r.room for r in db.scalars(select(RoomVisibility).where(RoomVisibility.user_id == founder_id, RoomVisibility.to_investors.is_(True)))]


def set_investor_room(db: Session, founder: User, room: str, on: bool) -> dict:
    if room not in ROOMS:
        raise NotFound("Unknown room.")
    row = db.scalar(select(RoomVisibility).where(RoomVisibility.user_id == founder.id, RoomVisibility.room == room))
    if row is None:
        db.add(RoomVisibility(user_id=founder.id, room=room, audience=DEFAULT_AUDIENCE[room], to_investors=on))
    else:
        row.to_investors = on
    interactions.record(db, "investor_room", user_id=founder.id, room=room, on=on)
    db.commit()
    return visibility_out(db, founder)


def visibility_out(db: Session, founder: User) -> dict:
    p = privacy.read(db, founder.id)
    return {"rooms": visibility(db, founder.id), "investors": p.id_visible_to_investors, "investor_rooms": investor_rooms(db, founder.id)}


# ── Journey ─────────────────────────────────────────────────────────────


def journey(db: Session, founder: User) -> list[dict]:
    items: list[dict] = []
    for e in db.scalars(select(JourneyEntry).where(JourneyEntry.user_id == founder.id)):
        items.append({"id": str(e.id), "kind": e.kind, "title": e.title, "learned": e.learned,
                      "on": e.happened_on.isoformat(), "source": "you", "removable": True})
    saved = db.execute(
        select(BrewAnswer, Brew).join(Brew, Brew.id == BrewAnswer.brew_id)
        .where(BrewAnswer.user_id == founder.id, BrewAnswer.save_to_journey.is_(True))
    )
    for a, b in saved:
        items.append({"id": str(a.id), "kind": "reflection", "title": b.question, "learned": a.body,
                      "on": b.publish_on.isoformat(), "source": "daily_brew", "removable": False})
    from app.services import toolkit  # local import: toolkit imports id_builder too

    for sim in toolkit.saved_for_journey(db, founder.id):
        chosen = toolkit.path_title(sim)
        items.append({"id": str(sim.id), "kind": "simulation", "title": sim.assumption,
                      "learned": (f"Chose: {chosen}. " if chosen else "") + sim.reflection,
                      "on": (sim.decided_at or sim.created_at).date().isoformat(), "source": "simulator", "removable": False})
    built = id_builder.read(db, founder).built_at
    if built:
        items.append({"id": "id-built", "kind": "milestone", "title": "Built your ID", "learned": "",
                      "on": built[:10], "source": "idea_district", "removable": False})
    items.sort(key=lambda i: i["on"], reverse=True)
    return items


def add_journey(db: Session, founder: User, kind: str, title: str, on: date, learned: str) -> list[dict]:
    e = JourneyEntry(user_id=founder.id, kind=kind, title=title.strip(), happened_on=on, learned=learned.strip())
    db.add(e)
    db.flush()
    interactions.record(db, "journey_add", user_id=founder.id, entity_type="journey_entry", entity_id=e.id, kind=kind)
    db.commit()
    return journey(db, founder)


def delete_journey(db: Session, founder: User, entry_id: uuid.UUID) -> list[dict]:
    e = db.get(JourneyEntry, entry_id)
    if e is None or e.user_id != founder.id:
        raise NotFound("That entry isn't in your Journey.")
    db.delete(e)
    interactions.record(db, "journey_delete", user_id=founder.id, entity_type="journey_entry", entity_id=entry_id)
    db.commit()
    return journey(db, founder)


# ── Business, Needs & Aspirations (State) ───────────────────────────────


def business(db: Session, founder: User) -> dict:
    rows = [s for s in _state(db, founder.id) if s.field not in NEED_KINDS]
    return {"items": [_state_out(s) for s in rows], "fields": [{"field": f, "label": FIELD_LABEL[f]} for f in BUSINESS_FIELDS]}


def set_business(db: Session, founder: User, field: str, value: str) -> dict:
    """One current value per business field: the founder's word replaces whatever was there."""
    if field not in BUSINESS_FIELDS:
        raise NotFound("That isn't a Business field.")
    db.execute(
        update(IdState)
        .where(IdState.user_id == founder.id, IdState.field == field, IdState.superseded_at.is_(None))
        .values(superseded_at=utcnow())
    )
    db.add(IdState(user_id=founder.id, field=field, value=value.strip(), confidence="high", source="declared", facet="primary"))
    _note(db, founder.id, f"{FIELD_LABEL[field]} is now: {value.strip()}")
    interactions.record(db, "state_edit", user_id=founder.id, field=field)
    db.commit()
    return business(db, founder)


def needs(db: Session, founder: User) -> dict:
    rows = _state(db, founder.id)
    return {k: [_state_out(s) for s in rows if s.field == k] for k in NEED_KINDS}


def add_need(db: Session, founder: User, kind: str, value: str) -> dict:
    if kind not in NEED_KINDS:
        raise NotFound("Unknown kind.")
    db.add(IdState(user_id=founder.id, field=kind, value=value.strip(), confidence="high", source="declared", facet="primary"))
    _note(db, founder.id, f"Added {FIELD_LABEL[kind].lower()}: {value.strip()}")
    interactions.record(db, "state_add", user_id=founder.id, field=kind)
    db.commit()
    return needs(db, founder)


def remove_state(db: Session, founder: User, state_id: uuid.UUID) -> dict:
    s = db.get(IdState, state_id)
    if s is None or s.user_id != founder.id or s.superseded_at is not None:
        raise NotFound("That item is no longer in your District.")
    s.superseded_at = utcnow()
    _note(db, founder.id, f"No longer true, remove: {FIELD_LABEL.get(s.field, s.field)} — {s.value}")
    interactions.record(db, "state_remove", user_id=founder.id, field=s.field)
    db.commit()
    return needs(db, founder) if s.field in NEED_KINDS else business(db, founder)


# ── Progress ────────────────────────────────────────────────────────────


def _exp_out(e: Experiment) -> dict:
    return {"id": str(e.id), "title": e.title, "tried": e.tried, "happened": e.happened, "learned": e.learned,
            "status": e.status, "started_on": e.started_on.isoformat(), "ended_on": e.ended_on.isoformat() if e.ended_on else None}


def experiments(db: Session, founder: User) -> list[dict]:
    rows = list(db.scalars(select(Experiment).where(Experiment.user_id == founder.id).order_by(Experiment.started_on.desc())))
    rows.sort(key=lambda e: e.status != "running")  # running first, newest first within each
    return [_exp_out(e) for e in rows]


def add_experiment(db: Session, founder: User, title: str, tried: str, started_on: date) -> list[dict]:
    e = Experiment(user_id=founder.id, title=title.strip(), tried=tried.strip(), started_on=started_on)
    db.add(e)
    db.flush()
    interactions.record(db, "experiment_add", user_id=founder.id, entity_type="experiment", entity_id=e.id)
    db.commit()
    return experiments(db, founder)


def update_experiment(db: Session, founder: User, exp_id: uuid.UUID, happened: str | None, learned: str | None, status: str | None, ended_on: date | None) -> list[dict]:
    e = db.get(Experiment, exp_id)
    if e is None or e.user_id != founder.id:
        raise NotFound("That experiment isn't in your Progress room.")
    if happened is not None:
        e.happened = happened.strip()
    if learned is not None:
        e.learned = learned.strip()
    if status is not None:
        e.status = status
        e.ended_on = None if status == "running" else (ended_on or date.today())
    interactions.record(db, "experiment_update", user_id=founder.id, entity_type="experiment", entity_id=e.id, status=e.status)
    db.commit()
    return experiments(db, founder)


# ── Capabilities (Person) ───────────────────────────────────────────────


def capabilities(db: Session, founder: User) -> list[dict]:
    current = id_builder.read(db, founder)
    out = []
    for p in sorted(current.person, key=lambda p: p.strength, reverse=True):
        thin = p.confidence == "low" and p.strength < 0.2
        out.append({"dimension": p.dimension, "insight": p.insight, "confidence": p.confidence, "evidence": p.evidence,
                    "facet": p.facet, "enough_evidence": not thin})
    return out


# ── The District overview ───────────────────────────────────────────────


def overview(db: Session, founder: User) -> dict:
    vis = visibility(db, founder.id)
    state = _state(db, founder.id)
    exps = experiments(db, founder)
    j = journey(db, founder)
    n = needs(db, founder)
    return {
        "visibility": vis,
        "rooms": {
            "journey": {"count": len(j), "latest": j[0]["title"] if j else None},
            "business": {"count": sum(1 for s in state if s.field not in NEED_KINDS),
                         "latest": next((s.value for s in state if s.field == "project"), None)},
            "needs": {"count": len(n["need"]) + len(n["goal"]), "latest": n["need"][0]["value"] if n["need"] else None},
            "progress": {"count": len(exps), "latest": next((e["title"] for e in exps if e["status"] == "running"), None)},
            "capabilities": {"count": len(capabilities(db, founder)), "latest": None},
        },
    }
