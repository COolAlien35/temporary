from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ContentBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: Literal["heading", "paragraph", "math", "callout", "code"]
    text: str
    tone: Literal["key", "mistake", "try"] | None = None


class CheckpointRead(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    prompt: str
    options: list[str]


class LessonLink(BaseModel):
    label: str
    href: str


class LessonRead(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    type: Literal["Concept", "Interactive", "Studio task", "Lab"]
    minutes: int = Field(ge=0)
    xp: int = Field(ge=0)
    sections: list[ContentBlock]
    checkpoints: list[CheckpointRead]
    takeaways: list[str]
    links: list[LessonLink]


class UnitRead(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    tagline: str
    level: Literal["Beginner", "Intermediate", "Advanced"]
    minutes: int = Field(ge=0)
    prerequisites: list[str]
    lessons: list[LessonRead]
    xpTotal: int = Field(ge=0)
    badge: str
    tools: list[str]
    review_status: str
    is_placeholder: bool
    content_version: int = Field(ge=1)
