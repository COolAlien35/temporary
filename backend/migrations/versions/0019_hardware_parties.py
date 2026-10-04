"""Hardware party documents; existing rooms retain their circuit kind."""

import sqlalchemy as sa
from alembic import op

revision = "0019_hardware_parties"
down_revision = "0018_party_frozen_circuits"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "parties", sa.Column("kind", sa.String(16), server_default="circuit", nullable=False)
    )
    op.create_check_constraint(
        op.f("ck_parties_valid_kind"), "parties", "kind IN ('circuit','hardware')"
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_parties_valid_kind"), "parties", type_="check")
    op.drop_column("parties", "kind")
