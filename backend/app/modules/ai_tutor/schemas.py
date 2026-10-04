"""Authenticated tutor message API contracts."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.ai_tutor.context import TutorAction, TutorStage


class TutorMessageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: TutorAction
    stage: TutorStage
    prompt: str = Field(min_length=1, max_length=1_000)
    run_id: UUID | None = None
    circuit_id: UUID | None = None
    circuit_revision: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_context_reference(self) -> "TutorMessageCreate":
        if (self.circuit_id is None) != (self.circuit_revision is None):
            raise ValueError("Circuit ID and revision must be supplied together")
        if not self.prompt.strip():
            raise ValueError("Tutor prompt must contain text")
        return self


class TutorMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    learning_session_id: UUID
    run_id: UUID | None
    action: TutorAction
    stage: TutorStage
    prompt: str
    status: str
    role: str
    prompt_version: str
    model: str
    source_record_ids: list[str]
    response_text: str | None
    recommendation: dict[str, str] | None
    provider_called: bool | None
    error_code: str | None
    created_at: datetime
    completed_at: datetime | None
