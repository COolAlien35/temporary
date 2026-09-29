from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LearningSession(Base):
    __tablename__ = "learning_sessions"
    __table_args__ = (
        CheckConstraint("lesson_version >= 1", name="valid_lesson_version"),
        UniqueConstraint("learner_id", "idempotency_key", name="uq_learning_session_idempotency"),
        UniqueConstraint(
            "id", "learner_id", "lesson_id", "lesson_version", name="uq_learning_session_identity"
        ),
        Index("ix_learning_sessions_learner_created", "learner_id", "created_at", "id"),
        Index(
            "ix_learning_sessions_learner_lesson_created",
            "learner_id",
            "lesson_id",
            "created_at",
            "id",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    learner_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    lesson_id: Mapped[str] = mapped_column(String(120), nullable=False)
    lesson_version: Mapped[int] = mapped_column(Integer, nullable=False)
    idempotency_key: Mapped[UUID] = mapped_column(nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["learning_session_id", "learner_id", "lesson_id", "lesson_version"],
            [
                "learning_sessions.id",
                "learning_sessions.learner_id",
                "learning_sessions.lesson_id",
                "learning_sessions.lesson_version",
            ],
            name="fk_prediction_learning_session_identity",
        ),
        CheckConstraint("lesson_version >= 1", name="valid_lesson_version"),
        CheckConstraint(
            "cardinality(prediction_vector) = cardinality(basis_labels)", name="vector_size"
        ),
        CheckConstraint(
            "comparison_basis IN ('ideal_probability', 'noisy_probability', 'sampled_frequency')",
            name="valid_comparison_basis",
        ),
        CheckConstraint(
            "confidence IS NULL OR confidence BETWEEN 0 AND 1", name="valid_confidence"
        ),
        UniqueConstraint("learner_id", "idempotency_key", name="uq_prediction_idempotency"),
        UniqueConstraint("run_id", name="uq_predictions_run_id"),
        Index("ix_predictions_learner_locked", "learner_id", "locked_at", "id"),
        Index(
            "ix_predictions_learner_lesson_locked",
            "learner_id",
            "lesson_id",
            "lesson_version",
            "locked_at",
            "id",
        ),
        Index("ix_predictions_session_locked", "learning_session_id", "locked_at", "id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    learner_id: Mapped[UUID] = mapped_column(ForeignKey("profiles.id"), nullable=False)
    learning_session_id: Mapped[UUID] = mapped_column(nullable=False)
    lesson_id: Mapped[str] = mapped_column(String(120), nullable=False)
    lesson_version: Mapped[int] = mapped_column(Integer, nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    prediction_vector: Mapped[list[float]] = mapped_column(ARRAY(Float), nullable=False)
    basis_labels: Mapped[list[str]] = mapped_column(ARRAY(String(8)), nullable=False)
    measurement_qubits: Mapped[list[int]] = mapped_column(ARRAY(Integer), nullable=False)
    comparison_basis: Mapped[str] = mapped_column(String(24), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    idempotency_key: Mapped[UUID] = mapped_column(nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    run_id: Mapped[UUID | None] = mapped_column(ForeignKey("experiment_runs.id"))
    locked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
