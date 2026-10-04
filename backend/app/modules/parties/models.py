from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Party(Base):
    __tablename__ = "parties"
    __table_args__ = (
        CheckConstraint("capacity BETWEEN 2 AND 6", name="valid_capacity"),
        CheckConstraint("revision >= 0", name="valid_revision"),
        CheckConstraint("kind IN ('circuit','hardware')", name="valid_kind"),
        UniqueConstraint("owner_id", "create_key", name="uq_party_create"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    create_key: Mapped[UUID] = mapped_column(nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    capacity: Mapped[int] = mapped_column(nullable=False)
    kind: Mapped[str] = mapped_column(
        String(16), default="circuit", server_default="circuit", nullable=False
    )
    revision: Mapped[int] = mapped_column(default=0, nullable=False)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    closed: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Membership(Base):
    __tablename__ = "party_memberships"
    __table_args__ = (
        CheckConstraint("role IN ('owner','edit','comment','view')", name="valid_role"),
    )
    party_id: Mapped[UUID] = mapped_column(
        ForeignKey("parties.id", ondelete="CASCADE"), primary_key=True
    )
    profile_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    active: Mapped[bool] = mapped_column(default=True, nullable=False)


class Invitation(Base):
    __tablename__ = "party_invitations"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    party_id: Mapped[UUID] = mapped_column(ForeignKey("parties.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(default=False, nullable=False)


class PartyEvent(Base):
    __tablename__ = "party_events"
    __table_args__ = (
        UniqueConstraint("party_id", "revision", name="uq_party_event_revision"),
        UniqueConstraint("party_id", "event_id", name="uq_party_event_id"),
        Index("ix_party_event_pending", "delivered_at", "created_at"),
        Index("ix_party_event_actor_created", "actor_id", "created_at"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    party_id: Mapped[UUID] = mapped_column(
        ForeignKey("parties.id", ondelete="CASCADE"), nullable=False
    )
    event_id: Mapped[UUID] = mapped_column(nullable=False)
    actor_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    revision: Mapped[int] = mapped_column(nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    payload: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class FrozenCircuit(Base):
    __tablename__ = "party_frozen_circuits"
    __table_args__ = (
        UniqueConstraint("owner_id", "idempotency_key", name="uq_party_frozen_key"),
        CheckConstraint("party_revision >= 0", name="valid_revision"),
    )
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    party_id: Mapped[UUID] = mapped_column(
        ForeignKey("parties.id", ondelete="CASCADE"), nullable=False
    )
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    party_revision: Mapped[int] = mapped_column(nullable=False)
    idempotency_key: Mapped[UUID] = mapped_column(nullable=False)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
