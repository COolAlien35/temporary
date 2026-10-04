"""Revision-protected private circuit archive lifecycle."""

import sqlalchemy as sa
from alembic import op

revision = "0020_circuit_archive"
down_revision = "0019_hardware_parties"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "circuits",
        sa.Column("archived", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("circuits", "archived")
