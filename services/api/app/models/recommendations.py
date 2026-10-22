import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TableMixin, utcnow
from app.models.types import JSONType


class Recommendation(TableMixin, Base):
    """A hypothesis about what could happen if two people meet — not a verdict.

    Under ~200 users a human approves before anything is shown:
    status goes proposed → approved → shown → accepted | declined.
    """

    __tablename__ = "recommendations"

    user_a_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    user_b_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    match_type: Mapped[str] = mapped_column(String(40))  # e.g. NEED_TO_CAPABILITY
    intent: Mapped[str] = mapped_column(String(12), default="seek")  # seek help | offer help
    why_now: Mapped[str] = mapped_column(Text)
    why_them: Mapped[str] = mapped_column(Text)
    what_could_happen: Mapped[str] = mapped_column(Text)
    confidence: Mapped[str] = mapped_column(String(8))
    evidence: Mapped[dict] = mapped_column(JSONType, default=dict)
    status: Mapped[str] = mapped_column(String(12), default="proposed")
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id"))
    shown_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RecommendationOutcome(TableMixin, Base):
    """Three taps, twelve days later. The only evidence that reaches "validated"."""

    __tablename__ = "recommendation_outcomes"

    recommendation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("recommendations.id", ondelete="CASCADE"), index=True
    )
    reported_by_user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    did_meet: Mapped[bool | None] = mapped_column(Boolean)
    was_useful: Mapped[str | None] = mapped_column(String(12))  # not_really | yes | very
    will_talk_again: Mapped[str | None] = mapped_column(String(12))  # already | maybe | no
    notes: Mapped[str | None] = mapped_column(Text)


class NoMatchLog(TableMixin, Base):
    """Log the silences. "Nothing for this person for three weeks" is a finding."""

    __tablename__ = "no_match_log"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    reasons: Mapped[list] = mapped_column(JSONType)
    candidates_considered: Mapped[int] = mapped_column(Integer)
