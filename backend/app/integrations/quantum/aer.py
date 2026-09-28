"""Bounded ideal-circuit execution using Qiskit Aer.

Wire bitstrings run left to right in ``measurement_qubits`` order. Qiskit's
little-endian amplitude index and reversed classical-bit display are converted
here, so callers never have to guess either convention.
"""

from dataclasses import dataclass
from itertools import product
from math import isfinite
from typing import cast

import qiskit  # type: ignore[import-untyped]
import qiskit_aer  # type: ignore[import-untyped]
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

from app.integrations.quantum.contract import UnsupportedCircuit, ideal_measurement_qubits
from app.modules.circuits.schemas import CircuitSnapshot, GateInput

MAX_SHOTS = 8_192
MAX_SEED = 2**32 - 1
MAX_INLINE_STATEVECTOR_QUBITS = 5


@dataclass(frozen=True)
class AerResult:
    backend: str
    sdk_version: str
    aer_version: str
    shots: int
    seed: int | None
    measurement_qubits: tuple[int, ...]
    basis_labels: tuple[str, ...]
    exact_probabilities: dict[str, float]
    counts: dict[str, int]
    sampled_frequencies: dict[str, float]
    statevector: tuple[tuple[float, float], ...] | None
    capabilities: tuple[str, ...]


def _apply_gate(circuit: QuantumCircuit, gate: GateInput) -> None:
    q = gate.qubit
    target = gate.target
    theta = gate.theta
    if gate.type == "I":
        circuit.id(q)
    elif gate.type == "H":
        circuit.h(q)
    elif gate.type == "X":
        circuit.x(q)
    elif gate.type == "Y":
        circuit.y(q)
    elif gate.type == "Z":
        circuit.z(q)
    elif gate.type == "S":
        circuit.s(q)
    elif gate.type == "SDG":
        circuit.sdg(q)
    elif gate.type == "T":
        circuit.t(q)
    elif gate.type == "TDG":
        circuit.tdg(q)
    elif gate.type == "RX" and theta is not None:
        circuit.rx(theta, q)
    elif gate.type == "RY" and theta is not None:
        circuit.ry(theta, q)
    elif gate.type == "RZ" and theta is not None:
        circuit.rz(theta, q)
    elif gate.type == "CNOT" and target is not None:
        circuit.cx(q, target)
    elif gate.type == "CZ" and target is not None:
        circuit.cz(q, target)
    elif gate.type == "SWAP" and target is not None:
        circuit.swap(q, target)
    elif gate.type == "CP" and target is not None and theta is not None:
        circuit.cp(theta, q, target)
    elif gate.type == "CCX" and target is not None and gate.control2 is not None:
        circuit.ccx(q, target, gate.control2)
    elif gate.type == "BARRIER":
        circuit.barrier(q)
    else:
        raise UnsupportedCircuit(f"Unsupported gate: {gate.type}")


def _basis_labels(width: int) -> tuple[str, ...]:
    return tuple("".join(bits) for bits in product("01", repeat=width))


def _probabilities(
    amplitudes: list[complex], measurement_qubits: tuple[int, ...], labels: tuple[str, ...]
) -> dict[str, float]:
    probabilities = dict.fromkeys(labels, 0.0)
    for index, amplitude in enumerate(amplitudes):
        label = "".join(str((index >> qubit) & 1) for qubit in measurement_qubits)
        probabilities[label] += float(abs(amplitude) ** 2)
    if not all(isfinite(value) for value in probabilities.values()):
        raise RuntimeError("Aer returned non-finite probabilities")
    return probabilities


def run_aer(snapshot: CircuitSnapshot, *, shots: int, seed: int | None = None) -> AerResult:
    """Execute a validated snapshot; currently supports ideal terminal measurements."""
    if isinstance(shots, bool) or not 1 <= shots <= MAX_SHOTS:
        raise ValueError(f"shots must be between 1 and {MAX_SHOTS}")
    if seed is not None and (isinstance(seed, bool) or not 0 <= seed <= MAX_SEED):
        raise ValueError(f"seed must be between 0 and {MAX_SEED}")

    gates = sorted(snapshot.gates, key=lambda gate: (gate.step, gate.qubit, gate.id))
    measurement_qubits = ideal_measurement_qubits(snapshot)

    circuit = QuantumCircuit(snapshot.qubits)
    for gate in gates:
        if gate.type != "MEASURE":
            _apply_gate(circuit, gate)

    simulator = AerSimulator(method="statevector", max_parallel_threads=1, max_memory_mb=64)
    exact_circuit = circuit.copy()
    exact_circuit.save_statevector()
    exact_run = simulator.run(exact_circuit, shots=1, seed_simulator=seed).result()
    if not exact_run.success:
        raise RuntimeError("Aer exact simulation failed")
    amplitudes = [complex(value) for value in exact_run.get_statevector(exact_circuit).data]

    sample_circuit = QuantumCircuit(snapshot.qubits, len(measurement_qubits))
    sample_circuit.compose(circuit, inplace=True)
    for index, qubit in enumerate(measurement_qubits):
        sample_circuit.measure(qubit, len(measurement_qubits) - 1 - index)
    sample_run = simulator.run(sample_circuit, shots=shots, seed_simulator=seed).result()
    if not sample_run.success:
        raise RuntimeError("Aer shot sampling failed")
    labels = _basis_labels(len(measurement_qubits))
    raw_counts = cast(dict[str, int], sample_run.get_counts(sample_circuit))
    counts = {label: int(raw_counts.get(label, 0)) for label in labels}
    if sum(counts.values()) != shots:
        raise RuntimeError("Aer returned incomplete measurement counts")
    probabilities = _probabilities(amplitudes, measurement_qubits, labels)
    inline_statevector = (
        tuple((float(value.real), float(value.imag)) for value in amplitudes)
        if snapshot.qubits <= MAX_INLINE_STATEVECTOR_QUBITS
        else None
    )
    capabilities = (
        ("exact_probabilities", "shot_counts", "statevector")
        if inline_statevector
        else ("exact_probabilities", "shot_counts")
    )
    return AerResult(
        backend="qiskit_aer",
        sdk_version=qiskit.__version__,
        aer_version=qiskit_aer.__version__,
        shots=shots,
        seed=seed,
        measurement_qubits=measurement_qubits,
        basis_labels=labels,
        exact_probabilities=probabilities,
        counts=counts,
        sampled_frequencies={label: count / shots for label, count in counts.items()},
        statevector=inline_statevector,
        capabilities=capabilities,
    )
