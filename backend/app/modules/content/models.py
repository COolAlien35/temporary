"""Schema metadata for the existing curriculum chunk migration."""

from datetime import datetime
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, CheckConstraint, Computed, DateTime, Index, String, Text, func
from sqlalchemy import text as sql_text
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ContentChunk(Base):
    __tablename__ = "content_chunks"
    __table_args__ = (
        CheckConstraint(
            "source_type IN ('lesson', 'quiz_explanation', 'glossary')",
            name="valid_source_type",
        ),
        CheckConstraint("review_status IN ('reviewed', 'pending')", name="valid_review_status"),
        Index("ix_content_chunks_unit_lesson", "unit_id", "lesson_id"),
        Index("ix_content_chunks_concept_tags", "concept_tags", postgresql_using="gin"),
        Index("ix_content_chunks_search_vector", "search_vector", postgresql_using="gin"),
        Index(
            "ix_content_chunks_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(
        Vector(1536),
        nullable=False,
        comment=(
            "vector(1536); generated with text-embedding-3-small; "
            "changing dimensions requires re-embedding"
        ),
    )
    unit_id: Mapped[str] = mapped_column(String(32), nullable=False)
    lesson_id: Mapped[str] = mapped_column(String(128), nullable=False)
    concept_tags: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=sql_text("'{}'")
    )
    source_type: Mapped[str] = mapped_column(String(24), nullable=False)
    review_status: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=sql_text("'pending'")
    )
    is_placeholder: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=sql_text("false")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sql_text("now()")
    )
    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed("to_tsvector('english', text)", persisted=True),
    )
