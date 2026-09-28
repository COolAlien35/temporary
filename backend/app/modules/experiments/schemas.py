from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt

from app.modules.circuits.schemas import CircuitSnapshot
from app.modules.jobs.schemas import JobStatus


class RunCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    circuit_id: UUID
    circuit_revision: StrictInt = Field(ge=1)
    backend: Literal["qiskit_aer"] = "qiskit_aer"
    shots: StrictInt = Field(ge=1, le=8_192)
    seed: StrictInt | None = Field(default=None, ge=0, le=2**32 - 1)


class RunAccepted(BaseModel):
    job_id: UUID
    status: Literal["queued"] = "queued"
    status_url: str
    resource_id: UUID


class RunRead(BaseModel):
    id: UUID
    status: JobStatus
    error_code: str | None
    circuit_id: UUID
    circuit_revision: int
    circuit_snapshot: CircuitSnapshot
    checksum_sha256: str
    backend: str
    shots: int
    seed: int | None
    result: dict[str, object] | None
    created_at: datetime
