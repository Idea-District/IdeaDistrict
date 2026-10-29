"""Builds and reads the ID: Person (slow-changing) and State (fast-changing) kept apart.

build() makes two AI calls in parallel — one for Person, one for State + Gaps — because a
single call asking for all three truncates and fails to parse (a trap already hit).
"""

import json
import uuid
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.db.base import iso, utcnow
from app.models import (
    Choice,
    ContextAnswer,
    IdAttribute,
    IdState,
    InformationGap,
    Signal,
    Situation,
    User,
)
from app.schemas.demo import FounderID, FounderOut, Gap, PersonAttribute, StateItem
from app.services import interactions, privacy
from app.services.ai.client import AIClient
from app.services.errors import Conflict
from app.services.founders import founder_context

# The one-line "how you operate" summary is stored as a Person row with this dimension.
HEADLINE = "__headline__"
CONFIDENCES = {"low", "medium", "high"}

_ATTR = {
    "type": "object",
    "properties": {
        "dimension": {"type": "string"},
        "insight": {"type": "string"},
        "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
        "strength": {"type": "number"},
        "evidence": {"type": "string"},
        "facet": {"type": "string", "enum": ["primary", "secondary"]},
    },
    "required": ["dimension", "insight", "confidence", "strength", "evidence", "facet"],
}
_STATE = {
    "type": "object",
    "properties": {
        "field": {"type": "string"},
        "value": {"type": "string"},
        "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
        "facet": {"type": "string", "enum": ["primary", "secondary"]},
        "source": {"type": "string", "enum": ["declared", "inferred"]},
    },
    "required": ["field", "value", "confidence", "facet", "source"],
}
PERSON_SCHEMA = {
    "type": "object",
    "properties": {"headline": {"type": "string"}, "attributes": {"type": "array", "items": _ATTR}},
    "required": ["headline", "attributes"],
}
STATE_SCHEMA = {
    "type": "object",
    "properties": {
        "state": {"type": "array", "items": _STATE},
        "gaps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "dimension": {"type": "string"},
                    "question": {"type": "string"},
                    "why_it_matters": {"type": "string"},
                    "priority": {"type": "integer"},
                },
                "required": ["dimension", "question", "why_it_matters", "priority"],
            },
        },
    },
    "required": ["state", "gaps"],
}
TELL_ME_MORE_SCHEMA = {
    "type": "object",
    "properties": {
        "state": {"type": "array", "items": _STATE},
        "person": {"type": "array", "items": _ATTR},
        "acknowledgement": {"type": "string"},
    },
    "required": ["state", "person"],
}


# ── Build ───────────────────────────────────────────────────────────────


def build(db: Session, ai: AIClient, founder: User) -> FounderID:
    decisions = _decisions(db, founder.id)
    if not decisions:
        raise Conflict("Answer at least one situation before building the ID.")
    variables = {**founder_context(db, founder), "decisions": json.dumps(decisions)}

    def call(purpose: str, schema: dict, check):
        return ai.run(
            purpose=purpose,
            prompt_key=purpose,
            variables=variables,
            schema=schema,
            user_id=founder.id,
            max_output_tokens=1600,
            validate=check,
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        person_job = pool.submit(call, "build_person", PERSON_SCHEMA, _check_person)
        state_job = pool.submit(call, "build_state", STATE_SCHEMA, _check_state)
        person, state = person_job.result(), state_job.result()

    version = (db.scalar(select(func.max(IdAttribute.version)).where(IdAttribute.user_id == founder.id)) or 0) + 1
    evidence_count = len(decisions)
    db.add(
        IdAttribute(
            user_id=founder.id, dimension=HEADLINE, insight=str(person["headline"]).strip(),
            confidence="medium", strength=0.5, evidence_summary=f"From {evidence_count} decisions",
            signal_count=evidence_count, version=version,
        )
    )
    for a in person["attributes"]:
        db.add(_attribute_row(founder.id, a, version, evidence_count))

    _supersede_state(db, founder.id)
    for item in state["state"]:
        db.add(_state_row(founder.id, item))

    # The gaps the build found replace the ones discovery was working through.
    db.execute(
        update(InformationGap)
        .where(InformationGap.user_id == founder.id, InformationGap.status != "closed")
        .values(status="closed")
    )
    for g in state["gaps"]:
        db.add(
            InformationGap(
                user_id=founder.id, dimension=str(g["dimension"]).strip(), question=str(g["question"]).strip(),
                why_it_matters=str(g["why_it_matters"]).strip(), priority=_clamp_int(g.get("priority"), 1, 3, 2),
            )
        )
    founder.onboarding_stage = "id_built"
    interactions.record(db, "id_built", user_id=founder.id, version=version, decisions=evidence_count)
    db.commit()
    return read(db, founder)


def tell_me_more(db: Session, ai: AIClient, founder: User, text: str) -> FounderID:
    """Free text from the no-match screen → declared additions to the ID, tagged by facet."""
    note = ContextAnswer(user_id=founder.id, question_key="tell_me_more", answer_text=text.strip())
    db.add(note)
    db.commit()
    current = read(db, founder)
    variables = {
        **founder_context(db, founder),  # already includes this note under more_about_them
        "what_they_just_told_us": text.strip(),
        "current_state": json.dumps([s.model_dump() for s in current.state]),
    }
    data = ai.run(
        purpose="tell_me_more",
        prompt_key="tell_me_more",
        variables=variables,
        schema=TELL_ME_MORE_SCHEMA,
        user_id=founder.id,
        max_output_tokens=900,
        validate=_check_tell_me_more,
    )
    version = db.scalar(select(func.max(IdAttribute.version)).where(IdAttribute.user_id == founder.id)) or 1
    for item in data["state"]:
        row = _state_row(founder.id, {**item, "source": "declared"})
        db.add(row)
        db.add(
            Signal(
                user_id=founder.id, source_type="tell_me_more", source_id=note.id, signal_type="declared",
                dimension=row.field, facet=row.facet, value_text=row.value, evidence_text="You told us", confidence=1.0,
            )
        )
    for a in data.get("person", []):
        db.add(_attribute_row(founder.id, {**a, "confidence": _cap(a.get("confidence"), "medium")}, version, 1))
    interactions.record(db, "tell_me_more", user_id=founder.id, entity_type="context_answer", entity_id=note.id)
    db.commit()
    return read(db, founder)


# ── Read ────────────────────────────────────────────────────────────────


def read(db: Session, founder: User) -> FounderID:
    version = db.scalar(select(func.max(IdAttribute.version)).where(IdAttribute.user_id == founder.id))
    attrs = (
        list(
            db.scalars(
                select(IdAttribute)
                .where(IdAttribute.user_id == founder.id, IdAttribute.version == version)
                .order_by(IdAttribute.created_at)
            )
        )
        if version
        else []
    )
    headline = next((a for a in attrs if a.dimension == HEADLINE), None)
    person = [
        PersonAttribute(
            dimension=a.dimension, insight=a.insight, confidence=a.confidence, strength=a.strength,
            evidence=a.evidence_summary, facet=a.facet,
        )
        for a in attrs
        if a.dimension != HEADLINE
    ]
    state_rows = db.scalars(
        select(IdState).where(IdState.user_id == founder.id, IdState.superseded_at.is_(None)).order_by(IdState.created_at)
    )
    state = [
        StateItem(field=s.field, value=s.value, confidence=s.confidence, facet=s.facet, source=s.source)
        for s in state_rows
    ]
    if not state:  # not built yet: show what they declared
        state = _declared_state(db, founder.id)
    gaps = db.scalars(
        select(InformationGap)
        .where(InformationGap.user_id == founder.id, InformationGap.status != "closed")
        .order_by(InformationGap.priority, InformationGap.created_at)
    )
    return FounderID(
        founder=FounderOut(id=founder.id, name=founder.name),
        decisions=len(_decisions(db, founder.id)),
        built_at=iso(headline.created_at) if headline else None,
        headline=headline.insight if headline else "",
        state=state,
        person=person,
        gaps=[Gap(id=g.id, dimension=g.dimension, question=g.question, why_it_matters=g.why_it_matters, status=g.status) for g in gaps],
        overall_confidence="developing",  # only real-world outcomes can move this
        rings_true=privacy.latest_rings_true(db, founder.id),
    )


def id_changed_at(db: Session, founder_id: uuid.UUID):
    """When the ID last changed — recommendations older than this are stale."""
    times = [
        db.scalar(select(func.max(IdAttribute.created_at)).where(IdAttribute.user_id == founder_id)),
        db.scalar(select(func.max(IdState.created_at)).where(IdState.user_id == founder_id)),
    ]
    times = [t for t in times if t is not None]
    return max(times) if times else None


# ── Helpers ─────────────────────────────────────────────────────────────


def _decisions(db: Session, founder_id: uuid.UUID) -> list[dict]:
    rows = db.execute(
        select(Situation, Choice)
        .join(Choice, Choice.situation_id == Situation.id)
        .where(Choice.user_id == founder_id)
        .order_by(Choice.created_at)
    )
    return [
        {
            "dimension": s.dimension_targeted,
            "situation": s.situation_text,
            "chose": c.chosen_text,
            "refused": [o["text"] for o in c.not_chosen],
            "why": c.why_text or "",
            "seconds_to_decide": round((c.response_time_ms or 0) / 1000, 1),
        }
        for s, c in rows
    ]


def _attribute_row(founder_id, a: dict, version: int, signal_count: int) -> IdAttribute:
    confidence = a.get("confidence") if a.get("confidence") in CONFIDENCES else "low"
    return IdAttribute(
        user_id=founder_id,
        dimension=str(a.get("dimension", "")).strip()[:60] or "Unnamed",
        facet="secondary" if a.get("facet") == "secondary" else "primary",
        insight=str(a.get("insight", "")).strip(),
        confidence=confidence,
        strength=_clamp(a.get("strength"), 0.0, 1.0, 0.3),
        evidence_summary=str(a.get("evidence", "")).strip() or "Thin evidence",
        signal_count=signal_count,
        version=version,
    )


def _state_row(founder_id, item: dict) -> IdState:
    field = str(item.get("field", "")).strip().lower()[:40] or "note"
    return IdState(
        user_id=founder_id,
        field=field,
        facet="secondary" if item.get("facet") == "secondary" else "primary",
        value=str(item.get("value", "")).strip(),
        confidence=item.get("confidence") if item.get("confidence") in CONFIDENCES else "medium",
        source="declared" if item.get("source") == "declared" else "inferred",
    )


def _supersede_state(db: Session, founder_id: uuid.UUID) -> None:
    db.execute(
        update(IdState)
        .where(IdState.user_id == founder_id, IdState.superseded_at.is_(None))
        .values(superseded_at=utcnow())
    )


def _declared_state(db: Session, founder_id: uuid.UUID) -> list[StateItem]:
    rows = db.scalars(
        select(Signal).where(Signal.user_id == founder_id, Signal.signal_type == "declared").order_by(Signal.created_at)
    )
    latest: dict[str, Signal] = {}
    for s in rows:
        latest[s.dimension] = s
    return [
        StateItem(field=s.dimension.lower(), value=s.value_text, confidence="high", facet=s.facet, source="declared")
        for s in latest.values()
    ]


def _check_person(data: dict) -> None:
    if not str(data.get("headline", "")).strip():
        raise ValueError("empty headline")
    if not isinstance(data.get("attributes"), list) or len(data["attributes"]) < 2:
        raise ValueError("expected at least 2 person attributes")


def _check_state(data: dict) -> None:
    if not isinstance(data.get("state"), list) or not data["state"]:
        raise ValueError("expected state items")
    if not isinstance(data.get("gaps"), list):
        raise ValueError("gaps must be a list")


def _check_tell_me_more(data: dict) -> None:
    if not isinstance(data.get("state"), list) or not data["state"]:
        raise ValueError("expected at least one state item")


def _cap(confidence, ceiling: str) -> str:
    order = ["low", "medium", "high"]
    value = confidence if confidence in order else "low"
    return order[min(order.index(value), order.index(ceiling))]


def _clamp(value, lo: float, hi: float, default: float) -> float:
    try:
        return max(lo, min(hi, float(value)))
    except (TypeError, ValueError):
        return default


def _clamp_int(value, lo: int, hi: int, default: int) -> int:
    try:
        return max(lo, min(hi, int(value)))
    except (TypeError, ValueError):
        return default
