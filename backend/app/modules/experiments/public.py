"""Authorized experiment views for learning features."""

from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.experiments.schemas import RunRead
from app.modules.experiments.service import read_run
from app.modules.identity.public import Actor


def read_owned_run(session: Session, actor: Actor, run_id: UUID) -> RunRead:
    return read_run(session, actor, run_id)
