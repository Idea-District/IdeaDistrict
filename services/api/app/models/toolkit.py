"""The Quick Breaks room toolkit: Test an assumption (simulations) and Explore industries."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TableMixin


class Simulation(TableMixin, Base):
    """A thinking exercise, not a prediction. Private unless the founder saves it to their Journey."""

    __tablename__ = "simulations"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    assumption: Mapped[str] = mapped_column(Text)
    paths_json: Mapped[str] = mapped_column(Text)  # [{key, title, summary, tradeoffs:[{label,text}], watch_for}]
    question: Mapped[str] = mapped_column(Text)  # the reflection question the model asked
    chosen: Mapped[str | None] = mapped_column(String(2))  # "A" | "B"
    reflection: Mapped[str] = mapped_column(Text, default="")
    saved_to_journey: Mapped[bool] = mapped_column(Boolean, default=False)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class IndustryTopic(TableMixin, Base):
    """A short read on a market or business model, written by the team. Patterns to check, never statistics."""

    __tablename__ = "industry_topics"

    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(16))  # market | business_model
    minutes: Mapped[int] = mapped_column(Integer, default=3)
    summary: Mapped[str] = mapped_column(Text)
    sections_json: Mapped[str] = mapped_column(Text)  # [{heading, body}]
    questions_json: Mapped[str] = mapped_column(Text, default="[]")  # questions to ask yourself
    tags: Mapped[str] = mapped_column(String(300), default="")  # comma-separated keywords for "For you"
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
