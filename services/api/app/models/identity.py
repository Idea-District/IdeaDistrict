import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TableMixin, utcnow


class User(TableMixin, Base):
    """Basic identity. Not the ID — that lives in id_attributes / id_state."""

    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(320), unique=True)
    phone: Mapped[str | None] = mapped_column(String(32), unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    organisation: Mapped[str | None] = mapped_column(String(200))
    role_title: Mapped[str | None] = mapped_column(String(120))
    linkedin_url: Mapped[str | None] = mapped_column(String(300))
    city: Mapped[str | None] = mapped_column(String(80))
    country: Mapped[str | None] = mapped_column(String(80))
    user_type: Mapped[str] = mapped_column(String(20), default="founder")  # founder | investor | admin
    onboarding_stage: Mapped[str] = mapped_column(String(30), default="context")
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class UserPrivacySettings(TableMixin, Base):
    """Consent as columns, from week one. Investor visibility is opt-in: defaults are off."""

    __tablename__ = "user_privacy_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    id_visible_to_investors: Mapped[bool] = mapped_column(Boolean, default=False)
    state_visible_to_investors: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_introductions: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
