"""Read the frontend curriculum export until durable content versions arrive."""

from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, Field

from app.modules.curriculum.schemas import UnitRead


class CurriculumExport(BaseModel):
    schema_version: int = Field(ge=1)
    content_version: int = Field(ge=1)
    units: list[dict[str, object]]


def curriculum_path() -> Path:
    backend_root = Path(__file__).resolve().parents[3]
    deployed_path = backend_root / "content" / "curriculum.json"
    if deployed_path.is_file():
        return deployed_path
    return backend_root.parent / "content" / "curriculum.json"


@lru_cache(maxsize=1)
def list_units() -> tuple[UnitRead, ...]:
    export = CurriculumExport.model_validate_json(curriculum_path().read_text(encoding="utf-8"))
    units = tuple(
        UnitRead.model_validate({**unit, "content_version": export.content_version})
        for unit in export.units
    )
    unit_ids = [unit.id for unit in units]
    lesson_ids = [lesson.id for unit in units for lesson in unit.lessons]
    checkpoint_ids = [
        checkpoint.id
        for unit in units
        for lesson in unit.lessons
        for checkpoint in lesson.checkpoints
    ]
    if len(unit_ids) != len(set(unit_ids)):
        raise ValueError("Duplicate curriculum unit ID")
    if len(lesson_ids) != len(set(lesson_ids)):
        raise ValueError("Duplicate curriculum lesson ID")
    if len(checkpoint_ids) != len(set(checkpoint_ids)):
        raise ValueError("Duplicate curriculum checkpoint ID")
    return units


def get_unit(unit_id: str) -> UnitRead | None:
    return next((unit for unit in list_units() if unit.id == unit_id), None)
