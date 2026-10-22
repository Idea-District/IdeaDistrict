"""Write to the interactions log. Every user-facing action calls record()."""

import uuid

from sqlalchemy.orm import Session

from app.models import Interaction


def record(
    db: Session,
    event_type: str,
    *,
    user_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    **metadata,
) -> None:
    """Adds the event to the session; the caller's commit persists it with the action it describes."""
    db.add(
        Interaction(
            user_id=user_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata_=metadata,
        )
    )
