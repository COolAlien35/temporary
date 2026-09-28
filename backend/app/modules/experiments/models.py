from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExperimentRun(Base):
    __tablename__ = "experiment_runs"
    __table_args__ = (
        ForeignKeyConstraint(
            ["circuit_id", "circuit_revision"],
            ["circuit_revisions.circuit_id", "circuit_revisions.revision"],
            name="fk_experiment_runs_circuit_revision",
        ),
        CheckConstraint("shots BETWEEN 1 AND 8192", name="valid_shots"),
        CheckConstraint("seed IS NULL OR seed BETWEEN 0 AND 4294967295", name="valid_seed"),
        UniqueConstraint("owner_id", "idempotency_key", name="uq_experiment_runs_idempotency"),
        Index("ix_experiment_runs_owner_created", "owner_id", "created_at", "id"),
    )

    id: Mapped[UUID] = mapped_column(ForeignKey("jobs.id"), primary_key=True)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    circuit_id: Mapped[UUID] = mapped_column(nullable=False)
    circuit_revision: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    backend: Mapped[str] = mapped_column(String(32), nullable=False)
    shots: Mapped[int] = mapped_column(Integer, nullable=False)
    seed: Mapped[int | None] = mapped_column(BigInteger)
    idempotency_key: Mapped[UUID] = mapped_column(nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
