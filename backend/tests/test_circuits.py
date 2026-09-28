import pytest
from pydantic import ValidationError

from app.modules.circuits.schemas import CircuitDraft
from app.modules.circuits.service import snapshot_and_hash


def test_canonical_circuit_hash_ignores_gate_array_order():
    gates = [
        {"id": "cnot", "type": "CNOT", "step": 1, "qubit": 0, "target": 1},
        {"id": "h", "type": "H", "step": 0, "qubit": 0},
        {"id": "m1", "type": "MEASURE", "step": 2, "qubit": 1},
        {"id": "m0", "type": "MEASURE", "step": 2, "qubit": 0},
    ]
    first = CircuitDraft.model_validate({"name": " Bell Pair ", "qubits": 2, "gates": gates})
    second = CircuitDraft.model_validate({"name": "Bell Pair", "qubits": 2, "gates": gates[::-1]})
    first_snapshot, first_hash = snapshot_and_hash(first)
    second_snapshot, second_hash = snapshot_and_hash(second)
    assert first_snapshot == second_snapshot
    assert first_hash == second_hash
    assert first_snapshot["name"] == "Bell Pair"
    assert [gate["id"] for gate in first_snapshot["gates"]] == ["h", "cnot", "m0", "m1"]


@pytest.mark.parametrize(
    "gates",
    [
        [{"id": "h", "type": "H", "step": 0, "qubit": 0, "theta": 1}],
        [{"id": "rx", "type": "RX", "step": 0, "qubit": 0}],
        [{"id": "rx", "type": "RX", "step": 0, "qubit": 0, "theta": float("nan")}],
        [{"id": "cp", "type": "CP", "step": 0, "qubit": 0, "target": 1}],
        [{"id": "cx", "type": "CNOT", "step": 0, "qubit": 0, "target": 0}],
        [{"id": "ccx", "type": "CCX", "step": 0, "qubit": 0, "target": 1, "control2": 1}],
        [{"id": "x", "type": "X", "step": 0, "qubit": 2}],
        [
            {"id": "h", "type": "H", "step": 0, "qubit": 0},
            {"id": "x", "type": "X", "step": 0, "qubit": 0},
        ],
        [
            {"id": "m", "type": "MEASURE", "step": 1, "qubit": 0},
            {"id": "x", "type": "X", "step": 2, "qubit": 0},
        ],
        [
            {"id": "h", "type": "H", "step": 0, "qubit": 0},
            {"id": "h", "type": "H", "step": 1, "qubit": 1},
        ],
        [{"id": "bad space", "type": "H", "step": 0, "qubit": 0}],
        [{"id": "h", "type": "H", "step": -1, "qubit": 0}],
        [{"id": "h", "type": "H", "step": 0, "qubit": 0, "answer": 1}],
    ],
)
def test_rejects_invalid_gate_layout_or_parameters(gates):
    with pytest.raises(ValidationError):
        CircuitDraft.model_validate({"name": "Test", "qubits": 2, "gates": gates})


def test_rejects_qubit_gate_and_payload_limits():
    with pytest.raises(ValidationError):
        CircuitDraft.model_validate({"name": "Test", "qubits": 9, "gates": []})
    with pytest.raises(ValidationError):
        CircuitDraft.model_validate(
            {
                "name": "Test",
                "qubits": 1,
                "gates": [
                    {"id": f"g{index}", "type": "H", "step": index, "qubit": 0}
                    for index in range(257)
                ],
            }
        )
