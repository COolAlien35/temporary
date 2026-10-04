from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.circuits.schemas import CircuitDraft, GateInput
from app.modules.parties.hardware import HardwareChanges, HardwareDesign


class PartyCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["circuit", "hardware"] = "circuit"
    circuit: CircuitDraft | None = None
    design: HardwareDesign | None = None
    capacity: int = Field(default=6, ge=2, le=6)

    @model_validator(mode="after")
    def matching_document(self) -> "PartyCreate":
        if self.kind == "circuit" and self.circuit is not None and self.design is None:
            return self
        if self.kind == "hardware" and self.design is not None and self.circuit is None:
            return self
        raise ValueError("Supply the document matching the party kind")


class InviteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["edit", "comment", "view"] = "edit"
    email: str | None = Field(
        default=None, min_length=3, max_length=320, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    )
    hours: int = Field(default=24, ge=1, le=168)


class InviteAccept(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(min_length=32, max_length=128)


class RoomAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    event_id: UUID
    circuit_id: UUID
    base_revision: int = Field(ge=0)
    kind: Literal["upsert", "delete", "settings", "chat", "hardware"]
    changes: HardwareChanges | None = None
    gate: GateInput | None = None
    gate_id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,64}$")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    qubits: int | None = Field(default=None, ge=1, le=8)
    text: str | None = Field(default=None, min_length=1, max_length=2000)

    @model_validator(mode="after")
    def validate_operation(self) -> "RoomAction":
        supplied = {
            key
            for key in ("gate", "gate_id", "name", "qubits", "text", "changes")
            if getattr(self, key) is not None
        }
        if self.kind == "upsert" and supplied == {"gate"}:
            return self
        if self.kind == "delete" and supplied == {"gate_id"}:
            return self
        if self.kind == "settings" and supplied and supplied <= {"name", "qubits"}:
            return self
        if self.kind == "hardware" and supplied == {"changes"}:
            return self
        if self.kind == "chat" and supplied == {"text"} and self.text and self.text.strip():
            self.text = self.text.strip()
            return self
        raise ValueError("Operation payload does not match kind")


class FreezeCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=0)
