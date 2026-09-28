from math import pi

import pytest
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

import app.integrations.quantum.aer as aer_module
from app.integrations.quantum.aer import UnsupportedCircuit, _apply_gate, _probabilities, run_aer
from app.modules.circuits.schemas import CircuitSnapshot, GateInput


def snapshot(qubits: int, gates: list[dict[str, object]]) -> CircuitSnapshot:
    return CircuitSnapshot.model_validate(
        {"schema_version": 1, "name": "test", "qubits": qubits, "gates": gates}
    )


def test_bell_state_uses_explicit_big_endian_labels() -> None:
    circuit = snapshot(
        2,
        [
            {"id": "h", "type": "H", "step": 0, "qubit": 0},
            {"id": "cx", "type": "CNOT", "step": 1, "qubit": 0, "target": 1},
        ],
    )
    result = run_aer(circuit, shots=1024, seed=7)
    assert result.measurement_qubits == (1, 0)
    assert result.basis_labels == ("00", "01", "10", "11")
    assert result.exact_probabilities["00"] == pytest.approx(0.5)
    assert result.exact_probabilities["11"] == pytest.approx(0.5)
    assert result.exact_probabilities["01"] == pytest.approx(0)
    assert result.exact_probabilities["10"] == pytest.approx(0)
    assert result.counts["01"] == result.counts["10"] == 0
    assert sum(result.counts.values()) == 1024
    assert run_aer(circuit, shots=1024, seed=7).counts == result.counts


def test_partial_measurement_orders_only_measured_qubits() -> None:
    circuit = snapshot(
        3,
        [
            {"id": "x", "type": "X", "step": 0, "qubit": 2},
            {"id": "m", "type": "MEASURE", "step": 1, "qubit": 2},
        ],
    )
    result = run_aer(circuit, shots=50)
    assert result.measurement_qubits == (2,)
    assert result.exact_probabilities == pytest.approx({"0": 0, "1": 1})
    assert result.counts == {"0": 0, "1": 50}


def test_mixed_gates_and_mid_circuit_measurement_policy() -> None:
    circuit = snapshot(
        2,
        [
            {"id": "ry", "type": "RY", "step": 0, "qubit": 0, "theta": pi},
            {"id": "m", "type": "MEASURE", "step": 1, "qubit": 0},
            {"id": "x", "type": "X", "step": 2, "qubit": 1},
        ],
    )
    with pytest.raises(UnsupportedCircuit, match="Mid-circuit"):
        run_aer(circuit, shots=100)


def test_shot_and_seed_bounds() -> None:
    circuit = snapshot(1, [])
    with pytest.raises(ValueError, match="shots"):
        run_aer(circuit, shots=0)
    with pytest.raises(ValueError, match="seed"):
        run_aer(circuit, shots=10, seed=-1)


@pytest.mark.parametrize(
    ("gate_type", "theta", "probability_one"),
    [
        ("I", None, 0),
        ("H", None, 0.5),
        ("X", None, 1),
        ("Y", None, 1),
        ("Z", None, 0),
        ("S", None, 0),
        ("SDG", None, 0),
        ("T", None, 0),
        ("TDG", None, 0),
        ("RX", pi, 1),
        ("RY", pi, 1),
        ("RZ", pi, 0),
    ],
)
def test_single_gate_basis_probabilities(
    gate_type: str, theta: float | None, probability_one: float
) -> None:
    gate: dict[str, object] = {"id": "gate", "type": gate_type, "step": 0, "qubit": 0}
    if theta is not None:
        gate["theta"] = theta
    result = run_aer(snapshot(1, [gate]), shots=100, seed=9)
    assert result.exact_probabilities["1"] == pytest.approx(probability_one)
    assert sum(result.exact_probabilities.values()) == pytest.approx(1)


def test_controlled_phase_swap_and_toffoli_preserve_gate_semantics() -> None:
    phase = snapshot(
        2,
        [
            {"id": "x0", "type": "X", "step": 0, "qubit": 0},
            {"id": "x1", "type": "X", "step": 0, "qubit": 1},
            {"id": "cz", "type": "CZ", "step": 1, "qubit": 0, "target": 1},
            {"id": "cp", "type": "CP", "step": 2, "qubit": 0, "target": 1, "theta": pi},
        ],
    )
    phase_result = run_aer(phase, shots=10)
    assert phase_result.exact_probabilities["11"] == pytest.approx(1)
    # CZ and CP(pi) each add a minus sign, so their phases cancel.
    assert phase_result.statevector is not None
    assert phase_result.statevector[3][0] == pytest.approx(1)

    swapped = snapshot(
        2,
        [
            {"id": "x", "type": "X", "step": 0, "qubit": 0},
            {"id": "swap", "type": "SWAP", "step": 1, "qubit": 0, "target": 1},
        ],
    )
    assert run_aer(swapped, shots=10).counts["10"] == 10

    toffoli = snapshot(
        3,
        [
            {"id": "x0", "type": "X", "step": 0, "qubit": 0},
            {"id": "x1", "type": "X", "step": 0, "qubit": 1},
            {"id": "ccx", "type": "CCX", "step": 1, "qubit": 0, "target": 1, "control2": 2},
        ],
    )
    assert run_aer(toffoli, shots=10).counts["111"] == 10


def test_large_statevector_is_not_inlined() -> None:
    result = run_aer(snapshot(6, []), shots=1, seed=2**32 - 1)
    assert result.statevector is None
    assert "statevector" not in result.capabilities
    assert result.counts["000000"] == 1


def test_invalid_numeric_types_and_limits_are_rejected() -> None:
    circuit = snapshot(1, [])
    for shots in (True, 8193):
        with pytest.raises(ValueError, match="shots"):
            run_aer(circuit, shots=shots)
    for seed in (True, 2**32):
        with pytest.raises(ValueError, match="seed"):
            run_aer(circuit, shots=1, seed=seed)


def test_barrier_is_supported_and_invalid_internal_gate_fails_closed() -> None:
    result = run_aer(snapshot(1, [{"id": "b", "type": "BARRIER", "step": 0, "qubit": 0}]), shots=1)
    assert result.counts == {"0": 1, "1": 0}
    invalid = GateInput.model_construct(
        id="bad", type="NOT_A_GATE", step=0, qubit=0, target=None, control2=None, theta=None
    )
    with pytest.raises(UnsupportedCircuit, match="Unsupported gate"):
        _apply_gate(QuantumCircuit(1), invalid)


def test_adapter_rejects_non_finite_probability_output() -> None:
    with pytest.raises(RuntimeError, match="non-finite"):
        _probabilities([complex(float("nan"), 0)], (0,), ("0", "1"))


@pytest.mark.parametrize("failed_call, message", [(1, "exact"), (2, "shot sampling")])
def test_aer_provider_failure_is_reported(
    monkeypatch: pytest.MonkeyPatch, failed_call: int, message: str
) -> None:
    class FakeResult:
        def __init__(self, success: bool) -> None:
            self.success = success

        def result(self) -> "FakeResult":
            return self

        def get_statevector(self, _circuit: QuantumCircuit) -> Statevector:
            return Statevector.from_label("0")

    class FakeSimulator:
        calls = 0

        def run(self, _circuit: QuantumCircuit, **_options: object) -> FakeResult:
            self.calls += 1
            return FakeResult(self.calls != failed_call)

    monkeypatch.setattr(aer_module, "AerSimulator", lambda **_options: FakeSimulator())
    with pytest.raises(RuntimeError, match=message):
        run_aer(snapshot(1, []), shots=10)
