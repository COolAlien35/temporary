from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CohortCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=3, max_length=120)

    @field_validator("name")
    @classmethod
    def nonblank_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Cohort name must contain at least three characters")
        return value


class CohortRead(BaseModel):
    id: UUID
    name: str
    role: str
    created_at: datetime


class MemberRead(BaseModel):
    profile_id: UUID
    name: str
    email: str
    role: str
    joined_at: datetime


class InvitationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if value.count("@") != 1 or any(not part for part in value.split("@")):
            raise ValueError("Invalid email address")
        return value


class InvitationRead(BaseModel):
    id: UUID
    email: str
    token: str
    expires_at: datetime


class InvitationAccept(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")
