import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TableMixin, utcnow
from app.models.types import JSONType


class ContextAnswer(TableMixin, Base):
    """Open-text answers: the four opening questions, and every "Tell me more" entry."""

    __tablename__ = "context_answers"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question_key: Mapped[str] = mapped_column(String(40))  # name | working_on | hoping_for | in_the_way | tell_me_more
    answer_choice: Mapped[str | None] = mapped_column(String(80))
    answer_text: Mapped[str] = mapped_column(Text)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DiscoverySession(TableMixin, Base):
    """One run through the situations."""

    __tablename__ = "discovery_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | complete | abandoned
    # "discovery" = the five-situation run; "probe" = one optional situation on a gap the founder tapped.
    kind: Mapped[str] = mapped_column(String(12), default="discovery")
    situation_count: Mapped[int] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Situation(TableMixin, Base):
    """Each generated scenario, with the prompt version that made it."""

    __tablename__ = "situations"

    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("discovery_sessions.id", ondelete="CASCADE"), index=True
    )
    sequence_no: Mapped[int] = mapped_column(Integer)
    consequence_text: Mapped[str | None] = mapped_column(Text)  # what the previous choice led to
    situation_text: Mapped[str] = mapped_column(Text)
    question_text: Mapped[str] = mapped_column(Text)
    why_asking: Mapped[str] = mapped_column(Text)  # the "Why we're asking this" panel
    options: Mapped[list] = mapped_column(JSONType)  # [{id, text, signal}]
    dimension_targeted: Mapped[str] = mapped_column(String(60))
    model_used: Mapped[str] = mapped_column(String(80))
    prompt_version: Mapped[str] = mapped_column(String(40))


class Choice(TableMixin, Base):
    """What they picked, what they refused, and how long it took."""

    __tablename__ = "choices"

    situation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("situations.id", ondelete="CASCADE"), unique=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    chosen_option_id: Mapped[str] = mapped_column(String(8))
    chosen_text: Mapped[str] = mapped_column(Text)
    why_text: Mapped[str | None] = mapped_column(Text)  # optional reason; the portal showed it's rich evidence
    not_chosen: Mapped[list] = mapped_column(JSONType)
    response_time_ms: Mapped[int | None] = mapped_column(Integer)
