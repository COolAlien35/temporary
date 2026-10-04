from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.parties.hardware import HardwareChanges, HardwareDesign, apply_hardware
from app.modules.parties.schemas import PartyCreate, RoomAction
from app.modules.parties.service import apply_operation


def operation(kind, **payload):
    return RoomAction(event_id=uuid4(), circuit_id=uuid4(), base_revision=0, kind=kind, **payload)


def test_gate_merge_delete_and_validation():
    snapshot = {"schema_version": 1, "name": "Test", "qubits": 2, "gates": []}
    h = {"id": "h", "type": "H", "step": 0, "qubit": 0}
    result = apply_operation(snapshot, operation("upsert", gate=h))
    assert result["gates"] == [h]
    replaced = apply_operation(result, operation("upsert", gate={**h, "type": "X"}))
    assert replaced["gates"][0]["type"] == "X"
    assert apply_operation(replaced, operation("delete", gate_id="h"))["gates"] == []
    with pytest.raises(ValidationError):
        apply_operation(result, operation("upsert", gate={**h, "id": "collision"}))
    with pytest.raises(ValidationError):
        apply_operation(result, operation("upsert", gate={**h, "qubit": 2}))


@pytest.mark.parametrize(
    "kind,payload",
    [
        ("chat", {"text": " "}),
        ("chat", {"text": "hi", "name": "spoof"}),
        ("delete", {}),
        ("upsert", {}),
        ("settings", {}),
    ],
)
def test_malformed_actions_fail(kind, payload):
    with pytest.raises(ValidationError):
        operation(kind, **payload)


def hardware_design():
    return {
        "meta": {"name": "Hardware", "qubits": 1, "createdAt": 0, "updatedAt": 0},
        "stages": [
            {
                "id": "300K",
                "label": "300K",
                "temperatureK": 300,
                "temperatureLabel": "300 K",
                "color": "#123456",
                "plateDiameterMm": 620,
                "plateThicknessMm": 16,
                "material": "Copper",
                "description": "Room temperature",
            }
        ],
        "placed": [],
        "routes": [],
    }


def test_hardware_payload_bounds_and_party_kind():
    design = hardware_design()
    assert PartyCreate(kind="hardware", design=design).design
    for body in (
        {"kind": "hardware", "circuit": {"name": "Wrong", "qubits": 1, "gates": []}},
        {"design": design},
        {"kind": "hardware", "design": {**design, "stages": []}},
    ):
        with pytest.raises(ValidationError):
            PartyCreate.model_validate(body)
    placed = {
        "id": "a",
        "componentId": "attenuator",
        "stageId": "300K",
        "position": {"x": 0, "y": 0},
        "rotationDeg": 0,
    }
    for invalid in (
        {**placed, "position": {"x": float("nan"), "y": 0}},
        {**placed, "stageId": "missing"},
        {**placed, "componentId": "unknown"},
    ):
        with pytest.raises(ValidationError):
            HardwareDesign.model_validate({**design, "placed": [invalid]})
    with pytest.raises(ValidationError):
        HardwareChanges.model_validate({"placed": {"upsert": [placed], "delete": ["a"]}})
    with pytest.raises(ValidationError):
        operation("hardware", changes={}, text="Spoof")


def test_hardware_atomic_stage_deletion_removes_components_and_routes():
    design = hardware_design()
    second = {**design["stages"][0], "id": "4K"}
    design["stages"].append(second)
    for identifier, stage in (("a", "300K"), ("b", "4K")):
        design["placed"].append(
            {
                "id": identifier,
                "componentId": "attenuator",
                "stageId": stage,
                "position": {"x": 0, "y": 0},
                "rotationDeg": 0,
            }
        )
    design["routes"] = [
        {
            "id": "wire",
            "lineType": "xy",
            "fromPlacedId": "a",
            "fromPort": "out",
            "toPlacedId": "b",
            "toPort": "in",
            "waypoints": [],
            "cableFamilyId": "ss-coax",
            "attenuationDb": 0,
        }
    ]
    result = apply_hardware(design, HardwareChanges.model_validate({"stages": {"delete": ["4K"]}}))
    assert [p["id"] for p in result["placed"]] == ["a"]
    assert result["routes"] == []
