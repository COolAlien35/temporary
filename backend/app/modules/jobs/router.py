from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.modules.identity.public import Actor, get_actor
from app.modules.jobs.schemas import FRONTEND_STATUS, JobRead
from app.modules.jobs.service import read_job

router = APIRouter(tags=["jobs"])


@router.get("/jobs/{job_id}", response_model=JobRead)
def get_job(
    job_id: UUID,
    actor: Actor = Depends(get_actor),  # noqa: B008
    session: Session = Depends(get_session),  # noqa: B008
) -> JobRead:
    job = read_job(session, actor, job_id)
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
