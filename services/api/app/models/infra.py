import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TableMixin, utcnow
from app.models.types import JSONType


class Interaction(TableMixin, Base):
    """The universal event log. Written from day one, before anything reads it —
    it is the one thing here that cannot be rebuilt later."""

    __tablename__ = "interactions"

    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), index=True)
    event_type: Mapped[str] = mapped_column(String(60), index=True)
    entity_type: Mapped[str | None] = mapped_column(String(40))
    entity_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONType, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class AiCall(TableMixin, Base):
    """Cost per user from the first call. Decides whether the unit economics work."""

    __tablename__ = "ai_calls"

    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), index=True)
    purpose: Mapped[str] = mapped_column(String(40))
    provider: Mapped[str] = mapped_column(String(40))
    model: Mapped[str] = mapped_column(String(80))
    prompt_version: Mapped[str] = mapped_column(String(40))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20))  # ok | retried | failed
    error: Mapped[str | None] = mapped_column(Text)  # the real error, never a generic one


class PromptVersion(TableMixin, Base):
    """Prompts live in the database, not in code, so every signal traces to the prompt that made it."""

    __tablename__ = "prompt_versions"
    __table_args__ = (UniqueConstraint("key", "version"),)

    key: Mapped[str] = mapped_column(String(40), index=True)
    version: Mapped[str] = mapped_column(String(40))
    body: Mapped[str] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(String(80))
    active: Mapped[bool] = mapped_column(Boolean, default=False)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=utcnow)


# Not yet: `embeddings` (needs pgvector on Postgres) and `whiteboard_*` (next build, by decision).
