"""Bounded hardware documents and atomic entity merges for shared wiring designs.

Structural validity is enforced here; scientific compatibility remains visible as
Hardware Studio diagnostics so learners can collaboratively debug imperfect designs.
"""

import json
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Identifier = Annotated[str, Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")]
Number = Annotated[float, Field(allow_inf_nan=False, ge=-10000, le=10000)]
CATALOG: dict[str, dict[str, dict[str, bool]]] = json.loads(
    Path(__file__).with_name("hardware_catalog.json").read_text()
)


class HardwareModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Position(HardwareModel):
    x: Number
    y: Number


class Waypoint(Position):
    stageId: Identifier


class HardwareStage(HardwareModel):
    id: Identifier
    label: str = Field(min_length=1, max_length=120)
    temperatureK: float = Field(ge=0, le=1000, allow_inf_nan=False)
    temperatureLabel: str = Field(min_length=1, max_length=120)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    plateDiameterMm: float = Field(gt=0, le=10000, allow_inf_nan=False)
    plateThicknessMm: float = Field(gt=0, le=1000, allow_inf_nan=False)
    coolingPowerW: float | None = Field(default=None, ge=0, le=100000, allow_inf_nan=False)
    material: str = Field(min_length=1, max_length=120)
    description: str = Field(max_length=2000)
    custom: bool | None = None


class HardwarePlaced(HardwareModel):
    id: Identifier
    componentId: Identifier
    stageId: Identifier
    position: Position
    rotationDeg: Number


class HardwareRoute(HardwareModel):
    id: Identifier
    lineType: Literal["xy", "flux", "readout-in", "readout-out", "dc-bias"]
    fromPlacedId: Identifier
    fromPort: Identifier
    toPlacedId: Identifier
    toPort: Identifier
    waypoints: list[Waypoint] = Field(max_length=64)
    cableFamilyId: Literal["ss-coax", "nbti-coax", "cu-coax", "twisted-pair"]
    attenuationDb: float = Field(ge=0, le=1000, allow_inf_nan=False)


class HardwareMeta(HardwareModel):
    name: str = Field(min_length=1, max_length=120)
    qubits: int = Field(ge=1, le=1000)
    createdAt: int = Field(ge=0, le=10**15)
    updatedAt: int = Field(ge=0, le=10**15)
    sourcePresetSlug: Identifier | None = None


class HardwareDesign(HardwareModel):
    meta: HardwareMeta
    stages: list[HardwareStage] = Field(min_length=1, max_length=16)
    placed: list[HardwarePlaced] = Field(max_length=128)
    routes: list[HardwareRoute] = Field(max_length=256)

    @model_validator(mode="after")
    def valid_structure(self) -> "HardwareDesign":
        for entities in (self.stages, self.placed, self.routes):
            if len({e.id for e in entities}) != len(entities):
                raise ValueError("Duplicate hardware IDs")
        stages = {s.id for s in self.stages}
        placed = {p.id: p for p in self.placed}
        for item in self.placed:
            if item.stageId not in stages or item.componentId not in CATALOG:
                raise ValueError("Unknown component or stage")
        occupied: set[tuple[str, str]] = set()
        for route in self.routes:
            if route.fromPlacedId == route.toPlacedId:
                raise ValueError("Route must connect different components")
            if any(w.stageId not in stages for w in route.waypoints):
                raise ValueError("Unknown waypoint stage")
            for component_id, port in (
                (route.fromPlacedId, route.fromPort),
                (route.toPlacedId, route.toPort),
            ):
                component = placed.get(component_id)
                if not component or port not in CATALOG[component.componentId]:
                    raise ValueError("Unknown route endpoint")
                endpoint = (component_id, port)
                if endpoint in occupied and not CATALOG[component.componentId][port]["multiple"]:
                    raise ValueError("Port is already connected")
                occupied.add(endpoint)
        if len(self.model_dump_json(exclude_none=True).encode()) > 65536:
            raise ValueError("Hardware document exceeds 64 KiB")
        return self


class EntityChanges(HardwareModel):
    """Shared delete shape; concrete variants validate their entity payloads."""

    delete: list[Identifier] = Field(default_factory=list, max_length=256)


class StageChanges(EntityChanges):
    upsert: list[HardwareStage] = Field(default_factory=list, max_length=16)


class PlacedChanges(EntityChanges):
    upsert: list[HardwarePlaced] = Field(default_factory=list, max_length=128)


class RouteChanges(EntityChanges):
    upsert: list[HardwareRoute] = Field(default_factory=list, max_length=256)


class HardwareChanges(HardwareModel):
    stages: StageChanges = Field(default_factory=StageChanges)
    placed: PlacedChanges = Field(default_factory=PlacedChanges)
    routes: RouteChanges = Field(default_factory=RouteChanges)
    meta: HardwareMeta | None = None

    @model_validator(mode="after")
    def meaningful(self) -> "HardwareChanges":
        for change in (self.stages, self.placed, self.routes):
            ids = [e.id for e in change.upsert]
            if len(set(ids)) != len(ids) or set(ids) & set(change.delete):
                raise ValueError("Duplicate or contradictory changes")
        if not self.meta and not any(
            c.upsert or c.delete for c in (self.stages, self.placed, self.routes)
        ):
            raise ValueError("Empty hardware edit")
        if len(self.model_dump_json(exclude_none=True).encode()) > 65536:
            raise ValueError("Hardware edit exceeds 64 KiB")
        return self


def merge_entities[Entity: (HardwareStage, HardwarePlaced, HardwareRoute)](
    current: list[Entity], upsert: list[Entity], delete: list[str]
) -> list[Entity]:
    merged = {e.id: e for e in current if e.id not in delete}
    merged.update({e.id: e for e in upsert})
    return list(merged.values())


def apply_hardware(snapshot: dict[str, object], changes: HardwareChanges) -> dict[str, object]:
    design = HardwareDesign.model_validate(snapshot)
    design.stages = merge_entities(design.stages, changes.stages.upsert, changes.stages.delete)
    design.placed = merge_entities(design.placed, changes.placed.upsert, changes.placed.delete)
    # Deletion cascades are atomic, including entities concurrently attached to the deleted item.
    design.placed = [p for p in design.placed if p.stageId not in changes.stages.delete]
    removed = set(changes.placed.delete) | {
        p.id
        for p in HardwareDesign.model_validate(snapshot).placed
        if p.stageId in changes.stages.delete
    }
    design.routes = merge_entities(design.routes, changes.routes.upsert, changes.routes.delete)
    design.routes = [
        r for r in design.routes if r.fromPlacedId not in removed and r.toPlacedId not in removed
    ]
    if changes.meta:
        design.meta = changes.meta
    return HardwareDesign.model_validate(design.model_dump()).model_dump(
        mode="json", exclude_none=True
    )
