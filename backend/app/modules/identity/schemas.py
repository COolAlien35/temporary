from datetime import datetime
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LearningPreferences(BaseModel):
    focus: Literal["foundations", "algorithms", "hardware"] = "foundations"
    pace: Literal["guided", "self-paced"] = "guided"
    reduceMotion: bool = False


class PreferencesPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    focus: Literal["foundations", "algorithms", "hardware"] | None = None
    pace: Literal["guided", "self-paced"] | None = None
    reduceMotion: bool | None = None


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=120)
    preferences: PreferencesPatch | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)

    @field_validator("name")
    @classmethod
    def nonblank_name(cls, value: str | None) -> str | None:
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Name must not be blank")
        return value

    @field_validator("timezone")
    @classmethod
    def known_timezone(cls, value: str | None) -> str | None:
        if value is not None:
            try:
                ZoneInfo(value)
            except (ZoneInfoNotFoundError, ValueError):
                raise ValueError("Timezone must be an IANA timezone name") from None
        return value


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str
    role: Literal["learner", "instructor"]
    preferences: LearningPreferences
    timezone: str
    revision: int
    created_at: datetime
    updated_at: datetime
