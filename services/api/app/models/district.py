"""A founder's own District rooms: Journey, Progress, and who can see each room.

Business and Needs & Aspirations live in id_state (State). Capabilities live in
id_attributes (Person). Those tables stay the single source; nothing is copied here.
"""

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TableMixin

ROOMS = ("journey", "business", "needs", "progress", "capabilities")
AUDIENCES = ("private", "connections", "community")
# Defaults (prototype C10): the personal rooms are private, the rest shared with connections.
DEFAULT_AUDIENCE = {"journey": "private", "progress": "private", "business": "connections", "needs": "connections", "capabilities": "connections"}


class JourneyEntry(TableMixin, Base):
    """A milestone or decision the founder chose to record."""

    __tablename__ = "journey_entries"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(12))  # milestone | decision
    title: Mapped[str] = mapped_column(String(200))
    happened_on: Mapped[date] = mapped_column(Date)
    learned: Mapped[str] = mapped_column(Text, default="")


class Experiment(TableMixin, Base):
    """Progress room: what you tried, what happened, what you learned."""

    __tablename__ = "experiments"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    tried: Mapped[str] = mapped_column(Text)
    happened: Mapped[str] = mapped_column(Text, default="")
    learned: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(10), default="running")  # running | done | stopped
    started_on: Mapped[date] = mapped_column(Date)
    ended_on: Mapped[date | None] = mapped_column(Date)


class RoomVisibility(TableMixin, Base):
    __tablename__ = "room_visibility"
    __table_args__ = (UniqueConstraint("user_id", "room"),)

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    room: Mapped[str] = mapped_column(String(16))
    audience: Mapped[str] = mapped_column(String(12))
    # Investors see a room only if it is ticked here AND the founder opted in to investors at all.
    to_investors: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
