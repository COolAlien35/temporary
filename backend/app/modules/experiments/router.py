from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Response
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.modules.experiments.schemas import RunAccepted, RunCreate, RunPage, RunRead
from app.modules.experiments.service import create_run, list_runs, read_run
from app.modules.identity.public import Actor, get_actor

router = APIRouter(prefix="/experiments/runs", tags=["experiments"])


@router.post("", response_model=RunAccepted, status_code=202)
def submit_run(
    body: RunCreate,
    response: Response,
    idempotency_key: UUID = Header(),  # noqa: B008
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
    settings: Settings = Depends(get_settings),  # noqa: B008
) -> RunAccepted:
    run_id = create_run(session, actor, body, idempotency_key, settings)
    status_url = f"/api/v1/jobs/{run_id}"
    response.headers["Location"] = status_url
    response.headers["Retry-After"] = "2"
    return RunAccepted(job_id=run_id, status_url=status_url, resource_id=run_id)


@router.get("", response_model=RunPage)
def get_runs(
    limit: int = Query(default=20, ge=1, le=50),  # noqa: B008
    cursor: str | None = None,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> RunPage:
    return list_runs(session, actor, limit, cursor)


@router.get("/{run_id}", response_model=RunRead, response_model_exclude_none=True)
def get_run(
    run_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> RunRead:
    return read_run(session, actor, run_id)
