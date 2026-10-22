"""Founder lookup and the context every AI task starts from."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ContextAnswer, User
from app.services.errors import NotFound

# The four opening questions (decision: open text, in the prototype's wording).
CONTEXT_KEYS = {
    "working_on": "What are you working on right now?",
    "hoping_for": "What are you hoping to make happen?",
    "in_the_way": "What's getting in your way?",
}


def get_founder(db: Session, founder_id: uuid.UUID) -> User:
    founder = db.get(User, founder_id)
    if founder is None:
        raise NotFound("No founder with that id. Start again from the beginning.")
    return founder


def latest_answers(db: Session, founder_id: uuid.UUID) -> dict[str, str]:
    """The most recent answer per opening question."""
    rows = db.scalars(
        select(ContextAnswer)
        .where(ContextAnswer.user_id == founder_id, ContextAnswer.question_key.in_(CONTEXT_KEYS))
        .order_by(ContextAnswer.answered_at)
    )
    return {row.question_key: row.answer_text for row in rows}


def tell_me_more_notes(db: Session, founder_id: uuid.UUID) -> list[str]:
    return list(
        db.scalars(
            select(ContextAnswer.answer_text)
            .where(ContextAnswer.user_id == founder_id, ContextAnswer.question_key == "tell_me_more")
            .order_by(ContextAnswer.answered_at)
        )
    )


def founder_context(db: Session, founder: User) -> dict[str, str]:
    """What the founder has told us, as AI-task variables."""
    answers = latest_answers(db, founder.id)
    context = {
        "name": founder.name,
        "working_on": answers.get("working_on", ""),
        "hoping_for": answers.get("hoping_for", ""),
        "in_the_way": answers.get("in_the_way", ""),
    }
    notes = tell_me_more_notes(db, founder.id)
    if notes:
        context["more_about_them"] = " | ".join(notes)
    return context
