"""SDK-independent capability checks shared by API and workers."""

from app.modules.circuits.schemas import CircuitSnapshot


class UnsupportedCircuit(ValueError):
    """The circuit is structurally valid but unavailable in this adapter."""


def ideal_measurement_qubits(snapshot: CircuitSnapshot) -> tuple[int, ...]:
    gates = sorted(snapshot.gates, key=lambda gate: (gate.step, gate.qubit, gate.id))
    measured = [gate for gate in gates if gate.type == "MEASURE"]
    if measured:
        first_measurement = measured[0].step
        if any(
            gate.step > first_measurement and gate.type not in {"MEASURE", "BARRIER"}
            for gate in gates
        ):
            raise UnsupportedCircuit("Mid-circuit measurement is not supported by ideal Aer runs")
        return tuple(sorted((gate.qubit for gate in measured), reverse=True))
    return tuple(range(snapshot.qubits - 1, -1, -1))
