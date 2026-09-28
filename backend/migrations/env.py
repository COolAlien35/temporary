from alembic import context

from app.db.base import Base
from app.db.session import get_engine

# Import each implemented module's model package here so autogenerate sees its metadata.
target_metadata = Base.metadata


def run_migrations() -> None:
    with get_engine().connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


run_migrations()
