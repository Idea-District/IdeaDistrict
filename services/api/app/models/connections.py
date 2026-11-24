"""Connections made by people, not by the matcher: requests that both people agree to, and opportunities.

A conversation still never starts cold. It opens only when a request is accepted (or an
introduction is accepted, see recommendations).
"""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TableMixin


class ConnectionRequest(TableMixin, Base):
    __tablename__ = "connection_requests"

    from_user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    to_user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    note: Mapped[str] = mapped_column(Text, default="")
    origin: Mapped[str] = mapped_column(String(16), default="explore")  # explore | visitor | opportunity | suggestion
    # Set when the request comes from accepting one of ID's suggestions: both people must agree.
    recommendation_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("recommendations.id", ondelete="CASCADE"), unique=True
    )
    status: Mapped[str] = mapped_column(String(10), default="pending")  # pending | accepted | declined | withdrawn
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Opportunity(TableMixin, Base):
    """Pilot calls, challenges, problem statements and open circles, posted by the team (investors next)."""

    __tablename__ = "opportunities"

    kind: Mapped[str] = mapped_column(String(12))  # pilot_call | challenge | problem | circle
    title: Mapped[str] = mapped_column(String(200))
    posted_by: Mapped[str] = mapped_column(String(160))  # organisation name as shown
    summary: Mapped[str] = mapped_column(Text)
    what_they_need: Mapped[str] = mapped_column(Text, default="")
    timeline: Mapped[str] = mapped_column(String(200), default="")
    how_to_respond: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[str] = mapped_column(String(300), default="")
    closes_on: Mapped[date | None] = mapped_column(Date)
    posted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class OpportunityResponse(TableMixin, Base):
    __tablename__ = "opportunity_responses"
    __table_args__ = (UniqueConstraint("opportunity_id", "user_id"),)

    opportunity_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("opportunities.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    saved: Mapped[bool] = mapped_column(default=False)
    interested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    note: Mapped[str] = mapped_column(Text, default="")
