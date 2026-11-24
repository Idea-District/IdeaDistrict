"""The District Cafe: Daily Brew, Open Table and What's On.

Content (brews, tables, What's On items) is written by the Idea District team in the admin
console. Founders answer, join and post. Anything a founder writes here is visible to the
community by design, and the team can hide it (`hidden_at`) without deleting it.
"""

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TableMixin


class Brew(TableMixin, Base):
    """One reflection question a day."""

    __tablename__ = "cafe_brews"

    question: Mapped[str] = mapped_column(Text)
    publish_on: Mapped[date] = mapped_column(Date, unique=True, index=True)
    drafted_by_ai: Mapped[bool] = mapped_column(Boolean, default=False)


class BrewAnswer(TableMixin, Base):
    __tablename__ = "cafe_brew_answers"
    __table_args__ = (UniqueConstraint("brew_id", "user_id"),)

    brew_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("cafe_brews.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(Text)
    # Kept for the Journey room (next build); answers are never copied anywhere else.
    save_to_journey: Mapped[bool] = mapped_column(Boolean, default=False)
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class BrewHelpful(TableMixin, Base):
    __tablename__ = "cafe_brew_helpful"
    __table_args__ = (UniqueConstraint("answer_id", "user_id"),)

    answer_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("cafe_brew_answers.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))


class CafeTable(TableMixin, Base):
    """An Open Table: a topic conversation founders join because the topic matters to them."""

    __tablename__ = "cafe_tables"

    title: Mapped[str] = mapped_column(String(160))
    prompt: Mapped[str] = mapped_column(Text)  # pinned at the top of the table
    status: Mapped[str] = mapped_column(String(12), default="open")  # open | scheduled | closed
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TableSeat(TableMixin, Base):
    __tablename__ = "cafe_table_seats"
    __table_args__ = (UniqueConstraint("table_id", "user_id"),)

    table_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("cafe_tables.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TablePost(TableMixin, Base):
    __tablename__ = "cafe_table_posts"

    table_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("cafe_tables.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text)
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class WhatsOn(TableMixin, Base):
    """The counter: events, open calls and new tables this week."""

    __tablename__ = "cafe_whats_on"

    kind: Mapped[str] = mapped_column(String(12))  # event | open_call | table
    title: Mapped[str] = mapped_column(String(160))
    detail: Mapped[str] = mapped_column(Text, default="")
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    place: Mapped[str | None] = mapped_column(String(160))
    table_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("cafe_tables.id", ondelete="SET NULL"))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class WhatsOnSave(TableMixin, Base):
    __tablename__ = "cafe_whats_on_saves"
    __table_args__ = (UniqueConstraint("item_id", "user_id"),)

    item_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("cafe_whats_on.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
