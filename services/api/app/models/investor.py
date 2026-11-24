"""The investor side. Investors are users with user_type="investor".

They never browse founders. They see a founder only through an introduction both sides
accepted (or a request the founder sent), and then only the rooms that founder ticked for
investors, and only while that founder is opted in to investors at all.
"""

import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TableMixin


class InvestorThesis(TableMixin, Base):
    __tablename__ = "investor_theses"

    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    firm: Mapped[str] = mapped_column(String(160), default="")
    sectors: Mapped[str] = mapped_column(Text, default="")  # comma-separated
    stages: Mapped[str] = mapped_column(String(120), default="")  # comma-separated: pre-seed, seed, series-a
    cheque: Mapped[str] = mapped_column(String(80), default="")  # e.g. "50L-2Cr"
    geography: Mapped[str] = mapped_column(String(160), default="")


class PipelineEntry(TableMixin, Base):
    """The investor's own notes on a founder they've been introduced to. Never shown to the founder."""

    __tablename__ = "investor_pipeline"
    __table_args__ = (UniqueConstraint("investor_id", "founder_id"),)

    investor_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    founder_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"))
    stage: Mapped[str] = mapped_column(String(16), default="introduced")  # introduced | conversation | diligence | passed
    note: Mapped[str] = mapped_column(Text, default="")
