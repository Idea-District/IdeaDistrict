import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(UTC)


def iso(dt: datetime) -> str:
    """ISO 8601 with an explicit UTC offset. SQLite returns naive datetimes; they are stored as UTC."""
    return (dt if dt.tzinfo else dt.replace(tzinfo=UTC)).isoformat()


class Base(DeclarativeBase):
    pass


class TableMixin:
    """Every table: uuid primary key + created_at (spec, "Database schema")."""

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
