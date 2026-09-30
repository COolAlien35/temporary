"""Create curriculum content chunks and pgvector search indexes."""

from alembic import op

revision = "0006_content_chunks"
down_revision = "0005_jobs"
branch_labels = None
depends_on = None

EMBEDDING_DIM = 1536


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        f"""
        CREATE TABLE content_chunks (
            id uuid PRIMARY KEY,
            text text NOT NULL,
            embedding vector({EMBEDDING_DIM}) NOT NULL,
            unit_id varchar(32) NOT NULL,
            lesson_id varchar(128) NOT NULL,
            concept_tags text[] NOT NULL DEFAULT '{{}}',
            source_type varchar(24) NOT NULL,
            review_status varchar(16) NOT NULL DEFAULT 'pending',
            is_placeholder boolean NOT NULL DEFAULT false,
            updated_at timestamptz NOT NULL DEFAULT now(),
            search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
            CONSTRAINT ck_content_chunks_valid_source_type
                CHECK (source_type IN ('lesson', 'quiz_explanation', 'glossary')),
            CONSTRAINT ck_content_chunks_valid_review_status
                CHECK (review_status IN ('reviewed', 'pending'))
        )
        """
    )
    op.execute(
        "COMMENT ON COLUMN content_chunks.embedding IS "
        "'vector(1536); generated with text-embedding-3-small; "
        "changing dimensions requires re-embedding'"
    )
    op.execute(
        "CREATE INDEX ix_content_chunks_embedding_hnsw "
        "ON content_chunks USING hnsw (embedding vector_cosine_ops)"
    )
    op.execute(
        "CREATE INDEX ix_content_chunks_search_vector ON content_chunks USING gin (search_vector)"
    )
    op.create_index("ix_content_chunks_unit_lesson", "content_chunks", ["unit_id", "lesson_id"])
    op.create_index(
        "ix_content_chunks_concept_tags",
        "content_chunks",
        ["concept_tags"],
        postgresql_using="gin",
    )


def downgrade() -> None:
    op.drop_index("ix_content_chunks_concept_tags", table_name="content_chunks")
    op.drop_index("ix_content_chunks_unit_lesson", table_name="content_chunks")
    op.execute("DROP INDEX ix_content_chunks_search_vector")
    op.execute("DROP INDEX ix_content_chunks_embedding_hnsw")
    op.drop_table("content_chunks")
    # Keep the shared extension installed; another feature may use it.
