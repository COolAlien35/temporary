from alembic import context

from app.db.base import Base
from app.db.session import get_engine
from app.modules.ai_tutor import models as tutor_models  # noqa: F401
from app.modules.circuits import models as circuit_models  # noqa: F401
from app.modules.cohorts import models as cohort_models  # noqa: F401
from app.modules.experiments import models as experiment_models  # noqa: F401
from app.modules.identity import models as identity_models  # noqa: F401
from app.modules.jobs import models as job_models  # noqa: F401
from app.modules.predictions import models as prediction_models  # noqa: F401

# Import each implemented module's model package here so autogenerate sees its metadata.
target_metadata = Base.metadata


def run_migrations() -> None:
    with get_engine().connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()


run_migrations()
