"""Stable content identifiers exposed to other backend modules."""

from dataclasses import dataclass

from app.modules.curriculum.source import list_units


@dataclass(frozen=True)
class LessonRef:
    id: str
    unit_id: str
    version: int


def find_lesson(lesson_id: str) -> LessonRef | None:
    for unit in list_units():
        for lesson in unit.lessons:
            if lesson.id == lesson_id:
                return LessonRef(lesson.id, unit.id, unit.content_version)
    return None
