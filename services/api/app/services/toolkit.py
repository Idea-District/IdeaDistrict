"""The Quick Breaks room toolkit.

Test an assumption: the AI lays out two paths and their trade-offs. The founder picks one,
reflects, and only then chooses whether it goes into their Journey. A thinking exercise, not a
prediction: nothing here feeds matching or the ID unless the founder saves it.

Explore industries: short reads written by the team, with a "For you" filter that matches
topic tags against the founder's own State.
"""

import json
import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import iso, utcnow
from app.models import IdState, IndustryTopic, Simulation, User
from app.services import id_builder, interactions
from app.services.ai.client import AIClient
from app.services.errors import Conflict, NotFound
from app.services.founders import founder_context

SIMULATE_SCHEMA = {
    "type": "object",
    "required": ["paths", "question", "grounded_in"],
    "properties": {
        "paths": {
            "type": "array",
            "minItems": 2,
            "maxItems": 2,
            "items": {
                "type": "object",
                "required": ["key", "title", "summary", "tradeoffs", "watch_for"],
                "properties": {
                    "key": {"type": "string", "enum": ["A", "B"]},
                    "title": {"type": "string"},
                    "summary": {"type": "string"},
                    "tradeoffs": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["label", "text"],
                            "properties": {"label": {"type": "string"}, "text": {"type": "string"}},
                        },
                    },
                    "watch_for": {"type": "string"},
                },
            },
        },
        "question": {"type": "string"},
        "grounded_in": {"type": "string"},
    },
}


def _check_paths(data: dict) -> None:
    paths = data["paths"]
    if len(paths) != 2 or {p.get("key") for p in paths} != {"A", "B"}:
        raise ValueError("need exactly two paths keyed A and B")
    for p in paths:
        if not p.get("title") or not p.get("summary") or len(p.get("tradeoffs") or []) < 2:
            raise ValueError("each path needs a title, a summary and trade-offs")


def _clean_path(p: dict) -> dict:
    return {
        "key": p["key"],
        "title": str(p["title"]).strip(),
        "summary": str(p["summary"]).strip(),
        "tradeoffs": [{"label": str(t.get("label", "")).strip(), "text": str(t.get("text", "")).strip()} for t in p["tradeoffs"][:3]],
        "watch_for": str(p.get("watch_for", "")).strip(),
    }


def _sim_out(s: Simulation) -> dict:
    data = json.loads(s.paths_json)
    return {
        "id": str(s.id),
        "assumption": s.assumption,
        "paths": data["paths"],
        "grounded_in": data.get("grounded_in", ""),
        "question": s.question,
        "chosen": s.chosen,
        "reflection": s.reflection,
        "saved_to_journey": s.saved_to_journey,
        "created_at": iso(s.created_at),
    }


def suggestions(db: Session, founder: User) -> list[str]:
    """Starter assumptions from the founder's own State. No AI: just their words, reframed."""
    rows = {s.field: s.value for s in db.scalars(
        select(IdState).where(IdState.user_id == founder.id, IdState.superseded_at.is_(None)).order_by(IdState.created_at)
    )}
    out = []
    if rows.get("project"):
        out.append(f"Customers will pay for this: {rows['project'].rstrip('.')}.")
    if rows.get("problem"):
        out.append(f"If I fix this, sales will follow: {rows['problem'].rstrip('.')}.")
    if rows.get("need"):
        out.append(f"Getting this help would change my next three months: {rows['need'].rstrip('.')}.")
    out.append("My first customers will come from people I already know.")
    return out[:3]


def simulate(db: Session, ai: AIClient, founder: User, assumption: str) -> dict:
    current = id_builder.read(db, founder)
    data = ai.run(
        purpose="simulate",
        prompt_key="simulate",
        variables={
            **founder_context(db, founder),
            "their_state": json.dumps([{"field": s.field, "value": s.value} for s in current.state]),
            "the_assumption": assumption.strip(),
        },
        schema=SIMULATE_SCHEMA,
        user_id=founder.id,
        max_output_tokens=1200,
        validate=_check_paths,
    )
    paths = sorted((_clean_path(p) for p in data["paths"]), key=lambda p: p["key"])
    sim = Simulation(
        user_id=founder.id,
        assumption=assumption.strip(),
        paths_json=json.dumps({"paths": paths, "grounded_in": str(data.get("grounded_in", "")).strip()}),
        question=str(data["question"]).strip(),
    )
    db.add(sim)
    db.flush()
    interactions.record(db, "simulation_run", user_id=founder.id, entity_type="simulation", entity_id=sim.id)
    db.commit()
    return _sim_out(sim)


def _own(db: Session, founder: User, sim_id: uuid.UUID) -> Simulation:
    s = db.get(Simulation, sim_id)
    if s is None or s.user_id != founder.id:
        raise NotFound("That simulation isn't yours or no longer exists.")
    return s


def decide(db: Session, founder: User, sim_id: uuid.UUID, chosen: str, reflection: str, save_to_journey: bool) -> dict:
    s = _own(db, founder, sim_id)
    if chosen not in ("A", "B"):
        raise Conflict("Choose path A or B.")
    s.chosen = chosen
    s.reflection = reflection.strip()
    s.saved_to_journey = save_to_journey
    s.decided_at = utcnow()
    interactions.record(db, "simulation_decide", user_id=founder.id, entity_type="simulation", entity_id=s.id,
                        chosen=chosen, saved_to_journey=save_to_journey)
    db.commit()
    return _sim_out(s)


def history(db: Session, founder: User, limit: int = 10) -> list[dict]:
    rows = db.scalars(select(Simulation).where(Simulation.user_id == founder.id).order_by(Simulation.created_at.desc()).limit(limit))
    return [_sim_out(s) for s in rows]


def get_simulation(db: Session, founder: User, sim_id: uuid.UUID) -> dict:
    return _sim_out(_own(db, founder, sim_id))


def saved_for_journey(db: Session, founder_id: uuid.UUID) -> list[Simulation]:
    return list(db.scalars(select(Simulation).where(Simulation.user_id == founder_id, Simulation.saved_to_journey.is_(True))))


def path_title(s: Simulation) -> str:
    paths = json.loads(s.paths_json)["paths"]
    return next((p["title"] for p in paths if p["key"] == s.chosen), "")


# ── Explore industries ──────────────────────────────────────────────────

_WORD = re.compile(r"[a-z]{4,}")


def _topic_out(t: IndustryTopic, for_you: bool, full: bool = False) -> dict:
    out = {"slug": t.slug, "title": t.title, "category": t.category, "minutes": t.minutes, "summary": t.summary, "for_you": for_you}
    if full:
        out["sections"] = json.loads(t.sections_json)
        out["questions"] = json.loads(t.questions_json)
    return out


def _founder_words(db: Session, founder_id: uuid.UUID) -> set[str]:
    text = " ".join(db.scalars(select(IdState.value).where(IdState.user_id == founder_id, IdState.superseded_at.is_(None))))
    return set(_WORD.findall(text.lower()))


def _matches(t: IndustryTopic, words: set[str]) -> bool:
    tags = {w.strip().lower() for w in t.tags.split(",") if w.strip()}
    return any(tag in words or any(w.startswith(tag) for w in words) for tag in tags)


def topics(db: Session, founder: User) -> list[dict]:
    words = _founder_words(db, founder.id)
    rows = list(db.scalars(select(IndustryTopic).where(IndustryTopic.archived_at.is_(None)).order_by(IndustryTopic.created_at)))
    out = [_topic_out(t, _matches(t, words)) for t in rows]
    out.sort(key=lambda t: not t["for_you"])
    return out


def topic(db: Session, founder: User, slug: str) -> dict:
    t = db.scalar(select(IndustryTopic).where(IndustryTopic.slug == slug, IndustryTopic.archived_at.is_(None)))
    if t is None:
        raise NotFound("That read isn't available.")
    interactions.record(db, "topic_read", user_id=founder.id, entity_type="industry_topic", entity_id=t.id)
    db.commit()
    return _topic_out(t, _matches(t, _founder_words(db, founder.id)), full=True)
