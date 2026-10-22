"""The public card for a founder: name, what they build, stage, city — never their private state."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import IdState, User
from app.schemas.demo import MatchPerson


def current_state(db: Session, user_id) -> list[IdState]:
    return list(db.scalars(select(IdState).where(IdState.user_id == user_id, IdState.superseded_at.is_(None))))


def first_value(state: list[IdState], field: str, default: str = "") -> str:
    return next((s.value for s in state if s.field == field and s.facet == "primary"), default)


def person_card(db: Session, user: User) -> MatchPerson:
    state = current_state(db, user.id)
    return MatchPerson(
        name=user.name,
        building=first_value(state, "project", user.organisation or ""),
        stage=first_value(state, "stage"),
        city=user.city or "",
    )
