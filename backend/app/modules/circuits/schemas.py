"""Bounded circuit input and canonical snapshot schemas."""

import json
from datetime import datetime
from math import pi
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    FiniteFloat,
    StrictInt,
    field_validator,
    model_validator,
)

GateType = Literal[
    "I",
    "H",
    "X",
    "Y",
    "Z",
    "S",
    "SDG",
    "T",
    "TDG",
    "RX",
    "RY",
    "RZ",
    "CNOT",
    "CZ",
    "SWAP",
    "CP",
    "CCX",
    "MEASURE",
    "BARRIER",
]
SINGLE_GATES = frozenset({"I", "H", "X", "Y", "Z", "S", "SDG", "T", "TDG", "MEASURE", "BARRIER"})
ROTATION_GATES = frozenset({"RX", "RY", "RZ"})
TWO_QUBIT_GATES = frozenset({"CNOT", "CZ", "SWAP"})
MAX_CIRCUIT_QUBITS = 8
MAX_CIRCUIT_GATES = 256
MAX_CIRCUIT_BYTES = 32_768


class GateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")
    type: GateType
    step: StrictInt = Field(ge=0, le=511)
    qubit: StrictInt = Field(ge=0)
    target: StrictInt | None = Field(default=None, ge=0)
    control2: StrictInt | None = Field(default=None, ge=0)
    theta: FiniteFloat | None = None

    @model_validator(mode="after")
    def validate_gate_shape(self) -> "GateInput":
        if self.type in SINGLE_GATES:
            if self.target is not None or self.control2 is not None or self.theta is not None:
                raise ValueError("Single-qubit gate has unsupported parameters")
        elif self.type in ROTATION_GATES:
            if self.target is not None or self.control2 is not None or self.theta is None:
                raise ValueError("Rotation gate requires only theta")
        elif self.type in TWO_QUBIT_GATES:
            if self.target is None or self.control2 is not None or self.theta is not None:
                raise ValueError("Two-qubit gate requires only target")
        elif self.type == "CP":
            if self.target is None or self.control2 is not None or self.theta is None:
                raise ValueError("CP requires target and theta")
        elif self.type == "CCX" and (
            self.target is None or self.control2 is None or self.theta is not None
        ):
            raise ValueError("CCX requires target and control2")
        if self.theta is not None and abs(self.theta) > 100 * pi:
            raise ValueError("Rotation angle exceeds the supported range")
        return self


class CircuitDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    qubits: StrictInt = Field(ge=1, le=MAX_CIRCUIT_QUBITS)
    gates: list[GateInput] = Field(max_length=MAX_CIRCUIT_GATES)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Circuit name cannot be blank")
        return value

    @model_validator(mode="after")
    def validate_layout(self) -> "CircuitDraft":
        gate_ids: set[str] = set()
        occupied: set[tuple[int, int]] = set()
        measured: dict[int, int] = {}
        for gate in sorted(self.gates, key=lambda item: (item.step, item.qubit, item.id)):
            if gate.id in gate_ids:
                raise ValueError("Gate IDs must be unique")
            gate_ids.add(gate.id)
            qubits = [gate.qubit]
            if gate.target is not None:
                qubits.append(gate.target)
            if gate.control2 is not None:
                qubits.append(gate.control2)
            if len(set(qubits)) != len(qubits) or any(qubit >= self.qubits for qubit in qubits):
                raise ValueError("Gate qubits must be distinct and within the circuit")
            for qubit in qubits:
                slot = (gate.step, qubit)
                if slot in occupied:
                    raise ValueError("A qubit cannot have two gates in one time step")
                occupied.add(slot)
                if qubit in measured and gate.type != "BARRIER":
                    raise ValueError("A measured qubit cannot receive another gate")
            if gate.type == "MEASURE":
                measured[gate.qubit] = gate.step
        encoded = json.dumps(
            self.model_dump(mode="json"), ensure_ascii=False, separators=(",", ":")
        )
        if len(encoded.encode()) > MAX_CIRCUIT_BYTES:
            raise ValueError("Circuit payload is too large")
        return self

    def canonical_snapshot(self) -> dict[str, object]:
        gates = sorted(self.gates, key=lambda gate: (gate.step, gate.qubit, gate.id))
        return {
            "schema_version": 1,
            "name": self.name,
            "qubits": self.qubits,
            "gates": [gate.model_dump(mode="json", exclude_none=True) for gate in gates],
        }


class CircuitSnapshot(CircuitDraft):
    schema_version: Literal[1]


class CircuitRead(BaseModel):
    id: UUID
    revision: int = Field(ge=1)
    snapshot: CircuitSnapshot
    checksum_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    created_at: datetime
    updated_at: datetime
