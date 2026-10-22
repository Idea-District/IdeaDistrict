"""Consent as data. Investor visibility is opt-in; introductions can be paused."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Interaction, UserPrivacySettings
from app.schemas.demo import PrivacyIn, PrivacyOut, RingsTrue
from app.services import interactions

FIELDS = ("id_visible_to_investors", "state_visible_to_investors", "allow_introductions")


def settings_for(db: Session, founder_id: uuid.UUID) -> UserPrivacySettings:
    row = db.scalar(select(UserPrivacySettings).where(UserPrivacySettings.user_id == founder_id))
    if row is None:  # founders created before privacy rows existed
        row = UserPrivacySettings(user_id=founder_id)
        db.add(row)
        db.flush()
    return row


def read(db: Session, founder_id: uuid.UUID) -> PrivacyOut:
    row = settings_for(db, founder_id)
    db.commit()
    return PrivacyOut(**{f: getattr(row, f) for f in FIELDS})


def update(db: Session, data: PrivacyIn) -> PrivacyOut:
    row = settings_for(db, data.founder_id)
    changes = {f: v for f in FIELDS if (v := getattr(data, f)) is not None}
    for field, value in changes.items():
        setattr(row, field, value)
    if changes:
        interactions.record(db, "privacy_changed", user_id=data.founder_id, **changes)
    db.commit()
    return PrivacyOut(**{f: getattr(row, f) for f in FIELDS})


def introductions_allowed(db: Session, founder_id: uuid.UUID) -> bool:
    row = db.scalar(select(UserPrivacySettings).where(UserPrivacySettings.user_id == founder_id))
    return row is None or row.allow_introductions


# ── "Does this ring true?" — the product's core assumption, measured on the ID screen ──

RINGS_TRUE_EVENT = "id_rings_true"


def record_rings_true(db: Session, founder_id: uuid.UUID, answer: RingsTrue) -> None:
    interactions.record(db, RINGS_TRUE_EVENT, user_id=founder_id, answer=answer)
    db.commit()


def latest_rings_true(db: Session, founder_id: uuid.UUID) -> RingsTrue | None:
    event = db.scalar(
        select(Interaction)
        .where(Interaction.user_id == founder_id, Interaction.event_type == RINGS_TRUE_EVENT)
        .order_by(Interaction.occurred_at.desc())
    )
    return (event.metadata_ or {}).get("answer") if event else None
