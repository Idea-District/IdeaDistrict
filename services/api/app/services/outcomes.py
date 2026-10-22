"""Outcomes — "Did that go anywhere?". The only route by which evidence reaches VALIDATED."""

import uuid
from datetime import timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import iso, utcnow
from app.models import Recommendation, RecommendationOutcome, Signal, User
from app.schemas.demo import OutcomeIn, OutcomeOut, PendingOutcomeOut
from app.services import interactions
from app.services.errors import Conflict, NotFound
from app.services.people import person_card


def pending(db: Session, founder_id: uuid.UUID) -> list[PendingOutcomeOut]:
    due_before = utcnow() - timedelta(days=get_settings().outcome_survey_delay_days)
    answered = select(RecommendationOutcome.recommendation_id).where(
        RecommendationOutcome.reported_by_user_id == founder_id
    )
    recs = db.scalars(
        select(Recommendation)
        .where(
            or_(Recommendation.user_a_id == founder_id, Recommendation.user_b_id == founder_id),
            Recommendation.status == "accepted",
            Recommendation.id.not_in(answered),
        )
        .order_by(Recommendation.responded_at)
    )
    out = []
    for rec in recs:
        introduced = rec.responded_at or rec.created_at
        if _naive(introduced) > _naive(due_before):
            continue
        other = db.get(User, rec.user_b_id if rec.user_a_id == founder_id else rec.user_a_id)
        out.append(PendingOutcomeOut(recommendation_id=rec.id, with_=person_card(db, other), introduced_at=iso(introduced)))
    return out


def report(db: Session, recommendation_id: uuid.UUID, data: OutcomeIn) -> OutcomeOut:
    rec = db.get(Recommendation, recommendation_id)
    if rec is None or data.founder_id not in (rec.user_a_id, rec.user_b_id):
        raise NotFound("Introduction not found.")
    if rec.status != "accepted":
        raise Conflict("Outcomes are asked only after an introduction is accepted.")
    already = db.scalar(
        select(RecommendationOutcome).where(
            RecommendationOutcome.recommendation_id == rec.id,
            RecommendationOutcome.reported_by_user_id == data.founder_id,
        )
    )
    if already:
        raise Conflict("You've already told us how this one went.")

    db.add(
        RecommendationOutcome(
            recommendation_id=rec.id,
            reported_by_user_id=data.founder_id,
            did_meet=data.did_meet,
            was_useful=data.was_useful if data.did_meet else None,
            will_talk_again=data.will_talk_again if data.did_meet else None,
        )
    )
    kind = rec.match_type.lower()
    useful = data.did_meet and data.was_useful in ("yes", "very")
    if useful:
        # Checked before adding this outcome's signal, so it never counts itself.
        first_confirmation = (
            db.scalar(
                select(Signal.id).where(
                    Signal.user_id == data.founder_id,
                    Signal.signal_type == "validated",
                    Signal.dimension == "Introductions",
                )
            )
            is None
        )
        db.add(
            Signal(
                user_id=data.founder_id,
                source_type="outcome",
                source_id=rec.id,
                signal_type="validated",
                dimension="Introductions",
                value_text=f"Introductions built on {kind} lead to useful meetings for you.",
                evidence_text="A real meeting you told us was worth it",
                confidence=0.8 if data.was_useful == "very" else 0.65,
            )
        )
        what_changed = (
            f"Introductions built on {kind} work for you — now validated by a real meeting, not just a scenario."
            if first_confirmation
            else f"Another real meeting confirms that introductions built on {kind} work for you."
        )
    elif data.did_meet:
        what_changed = f"Not every {kind} introduction lands for you. We'll weigh this kind lower next time."
    else:
        what_changed = "No meeting yet, so we won't count it either way."

    interactions.record(
        db,
        "outcome_reported",
        user_id=data.founder_id,
        entity_type="recommendation",
        entity_id=rec.id,
        did_meet=data.did_meet,
        was_useful=data.was_useful,
        will_talk_again=data.will_talk_again,
    )
    db.commit()
    return OutcomeOut(validated=useful, what_changed=what_changed)


def _naive(dt):
    return dt.replace(tzinfo=None) if dt is not None and dt.tzinfo else dt
