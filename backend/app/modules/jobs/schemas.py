from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

JobKind = Literal["simulation", "optimization", "grading", "export"]
JobStatus = Literal["queued", "running", "succeeded", "failed", "cancelled", "timed_out", "unknown"]
FrontendStatus = Literal["queued", "running", "completed", "failed"]

FRONTEND_STATUS: dict[str, FrontendStatus] = {
    "queued": "queued",
    "running": "running",
    "succeeded": "completed",
    "failed": "failed",
    "cancelled": "failed",
    "timed_out": "failed",
    "unknown": "running",
}


class JobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: JobKind
    status: JobStatus
    frontend_status: FrontendStatus
    result_summary: dict[str, object] | None
    error_code: str | None
    created_at: datetime
    updated_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class JobSummary(BaseModel):
    id: UUID
    kind: JobKind
    status: JobStatus
    frontend_status: FrontendStatus
    error_code: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class JobPage(BaseModel):
    items: list[JobSummary]
    next_cursor: str | None
