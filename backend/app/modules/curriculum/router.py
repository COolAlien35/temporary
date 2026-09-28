from fastapi import APIRouter, HTTPException

from app.modules.curriculum.schemas import UnitRead
from app.modules.curriculum.source import get_unit, list_units

router = APIRouter(prefix="/curriculum/units", tags=["curriculum"])


@router.get("", response_model=list[UnitRead], response_model_exclude_none=True)
def read_units() -> tuple[UnitRead, ...]:
    return list_units()


@router.get("/{unit_id}", response_model=UnitRead, response_model_exclude_none=True)
def read_unit(unit_id: str) -> UnitRead:
    unit = get_unit(unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return unit
