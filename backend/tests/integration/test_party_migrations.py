"""Fresh database and previous-release migration compatibility, without shared data changes."""

import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.db.session import get_engine

pytestmark = pytest.mark.integration


def test_party_migrations_fresh_upgrade_and_previous_release_roundtrip():
    database = f"ql_party_migration_{uuid4().hex}"
    engine = get_engine()
    backend = Path(__file__).resolve().parents[2]
    url = make_url(get_settings().database_url).set(database=database)
    environment = {**os.environ, "QL_DATABASE_URL": url.render_as_string(hide_password=False)}
    # The database name is generated exclusively by this test.
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        connection.exec_driver_sql(f'CREATE DATABASE "{database}"')
    try:
        for arguments in (
            ("upgrade", "head"),
            ("downgrade", "0016_learning_session_resume"),
            ("upgrade", "head"),
            ("check",),
        ):
            completed = subprocess.run(
                [sys.executable, "-m", "alembic", *arguments],
                cwd=backend,
                env=environment,
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )
            assert completed.returncode == 0, completed.stdout + completed.stderr
    finally:
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
            connection.exec_driver_sql(f'DROP DATABASE "{database}"')
