"""Recommendations: a hypothesis about what could happen if two founders meet — or an honest none.

Members are shown to the model under aliases (M1, M2…), so it can only pick someone real.
Their private needs are given to the model for reasoning; the prompt forbids repeating them.

Demo note: the product rule is that a human approves every match under ~200 users. For the
demo, matches are auto-approved and flagged in `evidence.demo_auto_approved`.
"""

import json
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models import IdAttribute, IdState, NoMatchLog, Recommendation, User
from app.schemas.demo import MatchOut, MatchPerson, NoMatchOut, RespondIn
from app.services import interactions
from app.services.ai.client import AIClient
from app.services.errors import Conflict, NotFound
from app.services.id_builder import HEADLINE, id_changed_at

MATCH_SCHEMA = {
    "type": "object",
    "properties": {
        "match": {"type": "string"},
        "match_type": {"type": "string"},
        "intent": {"type": "string", "enum": ["seek", "offer"]},
        "why_now": {"type": "string"},
        "why_them": {"type": "string"},
        "what_could_happen": {"type": "string"},
        "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
        "confidence_reason": {"type": "string"},
        "no_match_reasons": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["match", "confidence"],
}

FIRST_MEMBER_REASON = "You're one of the first members, so there's nobody to introduce you to yet."


def recommend(db: Session, ai: AIClient, founder: User) -> MatchOut | NoMatchOut:
    changed = id_changed_at(db, founder.id)
    if changed is None:
        raise Conflict("Build your ID first — recommendations come from it.")

    cached = _cached(db, founder.id, changed)
    if cached is not None:
        return cached

    declined = set(
        db.scalars(
            select(Recommendation.user_b_id).where(
                Recommendation.user_a_id == founder.id, Recommendation.status == "declined"
            )
        )
    )
    candidates = [c for c in _members_with_ids(db) if c.id != founder.id and c.id not in declined]
    if not candidates:
        return _no_match(db, founder.id, [FIRST_MEMBER_REASON], 0)

    aliases = {f"M{i + 1}": c for i, c in enumerate(candidates)}
    variables = {
        "the_founder": json.dumps(_profile(db, founder, include_private=True)),
        "members": json.dumps(
            [{"alias": alias, **_profile(db, c, include_private=True)} for alias, c in aliases.items()]
        ),
    }
    data = ai.run(
        purpose="match",
        prompt_key="match",
        variables=variables,
        schema=MATCH_SCHEMA,
        user_id=founder.id,
        max_output_tokens=900,
        validate=lambda d: _check_match(d, aliases),
    )

    alias = str(data.get("match", "")).strip().upper()
    if alias not in aliases:
        reasons = [str(r).strip() for r in data.get("no_match_reasons") or [] if str(r).strip()]
        return _no_match(db, founder.id, reasons or ["Nobody here fits well enough yet to be worth your time."], len(candidates))

    other = aliases[alias]
    rec = Recommendation(
        user_a_id=founder.id,
        user_b_id=other.id,
        match_type=str(data.get("match_type") or "INTERSECTION").strip()[:40],
        intent="offer" if data.get("intent") == "offer" else "seek",
        why_now=str(data.get("why_now", "")).strip(),
        why_them=str(data.get("why_them", "")).strip(),
        what_could_happen=str(data.get("what_could_happen", "")).strip(),
        confidence=data.get("confidence") if data.get("confidence") in {"low", "medium", "high"} else "low",
        evidence={"confidence_reason": str(data.get("confidence_reason", "")).strip(), "demo_auto_approved": True},
        status="shown",
        shown_at=utcnow(),
    )
    db.add(rec)
    db.flush()
    interactions.record(db, "recommendation_shown", user_id=founder.id, entity_type="recommendation", entity_id=rec.id)
    db.commit()
    return _match_out(db, rec)


def respond(db: Session, recommendation_id: uuid.UUID, data: RespondIn) -> None:
    rec = db.get(Recommendation, recommendation_id)
    if rec is None or rec.user_a_id != data.founder_id:
        raise NotFound("Recommendation not found.")
    rec.status = "accepted" if data.response == "accept" else "declined"
    rec.responded_at = utcnow()
    interactions.record(
        db, f"recommendation_{rec.status}", user_id=data.founder_id, entity_type="recommendation", entity_id=rec.id
    )
    db.commit()


# ── Helpers ─────────────────────────────────────────────────────────────


def _cached(db: Session, founder_id: uuid.UUID, changed) -> MatchOut | NoMatchOut | None:
    """Reuse the last answer unless the ID changed since (e.g. after Tell me more)."""
    rec = db.scalar(
        select(Recommendation).where(Recommendation.user_a_id == founder_id).order_by(Recommendation.created_at.desc())
    )
    none = db.scalar(select(NoMatchLog).where(NoMatchLog.user_id == founder_id).order_by(NoMatchLog.run_at.desc()))
    newest = max(
        [x for x in (rec, none) if x is not None],
        key=lambda x: x.created_at,
        default=None,
    )
    if newest is None or _naive(newest.created_at) < _naive(changed):
        return None
    if isinstance(newest, NoMatchLog):
        return NoMatchOut(reasons=newest.reasons)
    if newest.status == "declined":
        return None
    return _match_out(db, newest)


def _naive(dt):
    # SQLite drops tzinfo; compare consistently.
    return dt.replace(tzinfo=None) if dt is not None and dt.tzinfo else dt


def _no_match(db: Session, founder_id: uuid.UUID, reasons: list[str], considered: int) -> NoMatchOut:
    db.add(NoMatchLog(user_id=founder_id, reasons=reasons, candidates_considered=considered))
    interactions.record(db, "no_match", user_id=founder_id, candidates_considered=considered)
    db.commit()
    return NoMatchOut(reasons=reasons)


def _members_with_ids(db: Session) -> list[User]:
    built = select(IdAttribute.user_id).distinct()
    return list(db.scalars(select(User).where(User.id.in_(built), User.user_type == "founder")))


def _state(db: Session, user_id: uuid.UUID) -> list[IdState]:
    return list(
        db.scalars(select(IdState).where(IdState.user_id == user_id, IdState.superseded_at.is_(None)))
    )


def _first(state: list[IdState], field: str, default: str = "") -> str:
    return next((s.value for s in state if s.field == field and s.facet == "primary"), default)


def _profile(db: Session, user: User, include_private: bool) -> dict:
    state = _state(db, user.id)
    attrs = db.scalars(
        select(IdAttribute).where(IdAttribute.user_id == user.id, IdAttribute.dimension != HEADLINE)
    )
    profile = {
        "name": user.name,
        "building": _first(state, "project", user.organisation or ""),
        "stage": _first(state, "stage"),
        "city": user.city or "",
        "can_offer": [f"{s.value} ({s.facet})" for s in state if s.field == "offer"],
        "how_they_operate": [a.insight for a in attrs][:4],
    }
    if include_private:
        profile["needs_now_PRIVATE"] = [f"{s.value} ({s.facet})" for s in state if s.field == "need"]
        profile["goal_PRIVATE"] = _first(state, "goal")
    return profile


def _check_match(data: dict, aliases: dict) -> None:
    alias = str(data.get("match", "")).strip().upper()
    if alias != "NONE" and alias not in aliases:
        raise ValueError(f"unknown member alias '{alias}'")
    if alias != "NONE" and not str(data.get("why_them", "")).strip():
        raise ValueError("a match needs a why_them")


def _match_out(db: Session, rec: Recommendation) -> MatchOut:
    other = db.get(User, rec.user_b_id)
    state = _state(db, other.id)
    return MatchOut(
        id=rec.id,
        person=MatchPerson(
            name=other.name,
            building=_first(state, "project", other.organisation or ""),
            stage=_first(state, "stage"),
            city=other.city or "",
        ),
        match_type=rec.match_type,
        why_now=rec.why_now,
        why_them=rec.why_them,
        what_could_happen=rec.what_could_happen,
        confidence=rec.confidence,
        confidence_reason=(rec.evidence or {}).get("confidence_reason", ""),
    )
