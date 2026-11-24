"""Me: profile, the 2D avatar, downloading your data, deleting your account."""

import json

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.base import iso
from app.models import (
    BrewAnswer,
    ConnectionRequest,
    ContextAnswer,
    Experiment,
    IdAttribute,
    IdState,
    JourneyEntry,
    Message,
    Simulation,
    TablePost,
    User,
)
from app.services import interactions, privacy
from app.services.errors import Conflict

AVATAR_CHOICES = {
    "role": ("builder", "operator", "seller", "researcher"),
    "personality": ("calm", "bold", "curious"),
    "style": ("line", "flat", "paper"),
    "colour": ("persimmon", "forest", "dust", "beige"),
}


def profile(db: Session, user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.name,
        "one_line": user.one_line or "",
        "city": user.city or "",
        "avatar": json.loads(user.avatar_json) if user.avatar_json else None,
        "user_type": user.user_type,
        "joined_at": iso(user.created_at),
    }


def update_profile(db: Session, user: User, name: str | None, one_line: str | None, city: str | None) -> dict:
    if name is not None:
        user.name = name.strip()
    if one_line is not None:
        user.one_line = one_line.strip()
    if city is not None:
        user.city = city.strip()
    interactions.record(db, "profile_update", user_id=user.id)
    db.commit()
    return profile(db, user)


def set_avatar(db: Session, user: User, choice: dict) -> dict:
    for key, allowed in AVATAR_CHOICES.items():
        if choice.get(key) not in allowed:
            raise Conflict(f"Choose a {key} from: {', '.join(allowed)}.")
    user.avatar_json = json.dumps({k: choice[k] for k in AVATAR_CHOICES})
    interactions.record(db, "avatar_set", user_id=user.id)
    db.commit()
    return profile(db, user)


def export(db: Session, user: User) -> dict:
    """Everything we hold that the member gave us or that we worked out about them."""
    uid = user.id

    def rows(model, *where, fields):
        return [{f: (iso(getattr(r, f)) if hasattr(getattr(r, f), "isoformat") and f.endswith("_at") else
                     (getattr(r, f).isoformat() if hasattr(getattr(r, f), "isoformat") else getattr(r, f))) for f in fields}
                for r in db.scalars(select(model).where(*where))]

    interactions.record(db, "data_export", user_id=uid)
    db.commit()
    return {
        "exported_for": user.name,
        "profile": profile(db, user),
        "privacy": privacy.read(db, uid).model_dump(),
        "your_answers": rows(ContextAnswer, ContextAnswer.user_id == uid, fields=["question_key", "answer_text", "answered_at"]),
        "your_state": rows(IdState, IdState.user_id == uid, fields=["field", "value", "source", "confidence", "superseded_at", "created_at"]),
        "how_we_read_you": rows(IdAttribute, IdAttribute.user_id == uid, fields=["dimension", "insight", "confidence", "evidence_summary", "version", "created_at"]),
        "journey": rows(JourneyEntry, JourneyEntry.user_id == uid, fields=["kind", "title", "happened_on", "learned"]),
        "experiments": rows(Experiment, Experiment.user_id == uid, fields=["title", "tried", "happened", "learned", "status", "started_on"]),
        "daily_brew_answers": rows(BrewAnswer, BrewAnswer.user_id == uid, fields=["body", "save_to_journey", "created_at"]),
        "open_table_posts": rows(TablePost, TablePost.user_id == uid, fields=["body", "created_at"]),
        "tested_assumptions": rows(Simulation, Simulation.user_id == uid, fields=["assumption", "chosen", "reflection", "saved_to_journey", "created_at"]),
        "connection_requests": rows(ConnectionRequest, or_(ConnectionRequest.from_user_id == uid, ConnectionRequest.to_user_id == uid),
                                    fields=["origin", "note", "status", "created_at"]),
        "messages_you_sent": rows(Message, Message.sender_id == uid, fields=["body", "sent_at"]),
    }


def delete_account(db: Session, user: User) -> None:
    """Permanent. Rows that belong to the member go with them (ON DELETE CASCADE)."""
    db.delete(user)
    db.commit()
