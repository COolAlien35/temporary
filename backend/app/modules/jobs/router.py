from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.modules.identity.public import Actor, get_actor
from app.modules.jobs.models import Job
from app.modules.jobs.schemas import FRONTEND_STATUS, JobPage, JobRead
from app.modules.jobs.service import cancel_queued_job, list_jobs, read_job

router = APIRouter(tags=["jobs"])


@router.get("/jobs", response_model=JobPage)
def get_jobs(
    limit: int = Query(default=20, ge=1, le=50),
    cursor: str | None = Query(default=None),
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> JobPage:
    return list_jobs(session, actor, limit, cursor)


@router.get("/jobs/{job_id}", response_model=JobRead)
def get_job(
    job_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> JobRead:
    job = read_job(session, actor, job_id)
    return _job_read(job)


@router.post("/jobs/{job_id}/cancel", response_model=JobRead)
def cancel_job(
    job_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> JobRead:
    return _job_read(cancel_queued_job(session, actor, job_id))


def _job_read(job: Job) -> JobRead:
    return JobRead.model_validate(
        {
            "id": job.id,
            "kind": job.kind,
            "status": job.status,
            "frontend_status": FRONTEND_STATUS[job.status],
            "result_summary": job.result_summary,
            "error_code": job.error_code,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
            "started_at": job.started_at,
            "finished_at": job.finished_at,
        }
    )
