"""Stable read interface for consumers of immutable circuit revisions."""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.circuits.repository import get_owned_circuit, get_revision
from app.modules.circuits.schemas import CircuitSnapshot


@dataclass(frozen=True)
class OwnedCircuitRevision:
    circuit_id: UUID
    revision: int
    snapshot: CircuitSnapshot
    checksum_sha256: str


def owned_revision(
    session: Session, owner_id: UUID, circuit_id: UUID, revision_number: int
) -> OwnedCircuitRevision | None:
    circuit = get_owned_circuit(session, circuit_id, owner_id)
    if circuit is None:
        return None
    revision = get_revision(session, circuit.id, revision_number)
    if revision is None:
        return None
    return OwnedCircuitRevision(
        circuit.id,
        revision.revision,
        CircuitSnapshot.model_validate(revision.snapshot),
        revision.checksum_sha256,
    )
