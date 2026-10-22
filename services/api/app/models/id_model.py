"""The ID. Person and State are separate tables on purpose — never merge them.

A co-founder walking out is a State change. If it could rewrite Person, the
system would conclude the founder "became difficult" and every later
recommendation would be wrong.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TableMixin, utcnow

# Evidence ladder. Only real-world outcomes ever reach "validated".
SIGNAL_TYPES = ("declared", "observed", "inferred", "validated")

# Which side of the founder's life a fact belongs to ("Tell me more": also a designer).
FACETS = ("primary", "secondary")


class Signal(TableMixin, Base):
    """Evidence, never conclusions."""

    __tablename__ = "signals"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    source_type: Mapped[str] = mapped_column(String(30))  # context_answer | choice | outcome | tell_me_more
    source_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    signal_type: Mapped[str] = mapped_column(String(12))  # one of SIGNAL_TYPES
    dimension: Mapped[str] = mapped_column(String(60))
    facet: Mapped[str] = mapped_column(String(12), default="primary")
    value_text: Mapped[str] = mapped_column(Text)
    evidence_text: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float)
    model_version: Mapped[str | None] = mapped_column(String(80))
    superseded_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("signals.id"))


class IdAttribute(TableMixin, Base):
    """Person — changes slowly."""

    __tablename__ = "id_attributes"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    dimension: Mapped[str] = mapped_column(String(60))
    facet: Mapped[str] = mapped_column(String(12), default="primary")
    insight: Mapped[str] = mapped_column(Text)  # ≤ 20 words, written by the model
    confidence: Mapped[str] = mapped_column(String(8))  # low | medium | high
    strength: Mapped[float] = mapped_column(Float, default=0.0)  # 0..1, drives the bar
    evidence_summary: Mapped[str] = mapped_column(Text)  # ≤ 12 words
    signal_count: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)


class IdState(TableMixin, Base):
    """State — changes fast. Superseded rows are kept, so history is never lost."""

    __tablename__ = "id_state"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    field: Mapped[str] = mapped_column(String(40))  # project | goal | problem | constraint | need | offer | trajectory
    facet: Mapped[str] = mapped_column(String(12), default="primary")
    value: Mapped[str] = mapped_column(Text)
    confidence: Mapped[str] = mapped_column(String(8))
    source: Mapped[str] = mapped_column(String(12), default="inferred")  # declared | inferred | validated
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    superseded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class InformationGap(TableMixin, Base):
    """Drives next-best-discovery. Without it this is a fixed questionnaire in costume."""

    __tablename__ = "information_gaps"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    dimension: Mapped[str] = mapped_column(String(60))
    question: Mapped[str] = mapped_column(Text)
    why_it_matters: Mapped[str] = mapped_column(Text)
    priority: Mapped[int] = mapped_column(Integer, default=2)  # 1 = highest
    status: Mapped[str] = mapped_column(String(12), default="open")  # open | probing | closed
