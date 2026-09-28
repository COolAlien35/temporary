from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Cohort(Base):
    __tablename__ = "cohorts"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Membership(Base):
    __tablename__ = "cohort_memberships"
    __table_args__ = (
        CheckConstraint("role IN ('learner', 'instructor')", name="valid_role"),
        Index("ix_cohort_memberships_profile_id", "profile_id"),
    )

    cohort_id: Mapped[UUID] = mapped_column(
        ForeignKey("cohorts.id", ondelete="CASCADE"), primary_key=True
    )
    profile_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Invitation(Base):
    __tablename__ = "cohort_invitations"
    __table_args__ = (
        Index("ix_cohort_invitations_token_hash", "token_hash", unique=True),
        Index("ix_cohort_invitations_cohort_id", "cohort_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    cohort_id: Mapped[UUID] = mapped_column(
        ForeignKey("cohorts.id", ondelete="CASCADE"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_by: Mapped[UUID | None] = mapped_column(ForeignKey("profiles.id"))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
