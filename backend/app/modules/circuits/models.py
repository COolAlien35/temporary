from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Circuit(Base):
    __tablename__ = "circuits"
    __table_args__ = (
        CheckConstraint("current_revision >= 1", name="valid_revision"),
        UniqueConstraint("owner_id", "idempotency_key", name="uq_circuits_owner_idempotency"),
        Index("ix_circuits_owner_updated", "owner_id", "updated_at", "id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    archived: Mapped[bool] = mapped_column(default=False, server_default="false", nullable=False)
    current_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    idempotency_key: Mapped[UUID] = mapped_column(nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class CircuitRevision(Base):
    __tablename__ = "circuit_revisions"
    __table_args__ = (
        CheckConstraint("revision >= 1", name="valid_revision"),
        UniqueConstraint("circuit_id", "revision", name="uq_circuit_revisions_number"),
        Index("ix_circuit_revisions_circuit_created", "circuit_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    circuit_id: Mapped[UUID] = mapped_column(
        ForeignKey("circuits.id", ondelete="CASCADE"), nullable=False
    )
    revision: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
