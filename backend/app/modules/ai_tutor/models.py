"""Durable, owner-scoped tutor messages."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TutorMessage(Base):
    __tablename__ = "tutor_messages"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'completed', 'failed')", name="valid_status"),
        UniqueConstraint("owner_id", "idempotency_key", name="uq_tutor_message_idempotency"),
        Index("ix_tutor_messages_owner_created", "owner_id", "created_at", "id"),
        Index("ix_tutor_messages_session_created", "learning_session_id", "created_at", "id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    learning_session_id: Mapped[UUID] = mapped_column(
        ForeignKey("learning_sessions.id"), nullable=False
    )
    run_id: Mapped[UUID | None] = mapped_column(ForeignKey("experiment_runs.id"))
    idempotency_key: Mapped[UUID] = mapped_column(nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(24), nullable=False)
    stage: Mapped[str] = mapped_column(String(24), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    source_record_ids: Mapped[list[str]] = mapped_column(ARRAY(String(120)), nullable=False)
    response_text: Mapped[str | None] = mapped_column(Text)
    recommendation: Mapped[dict[str, str] | None] = mapped_column(JSONB)
    provider_called: Mapped[bool | None] = mapped_column()
    error_code: Mapped[str | None] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
