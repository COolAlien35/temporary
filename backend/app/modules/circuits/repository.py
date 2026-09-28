from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.circuits.models import Circuit, CircuitRevision


def get_owned_circuit(
    session: Session, circuit_id: UUID, owner_id: UUID, *, lock: bool = False
) -> Circuit | None:
    query = select(Circuit).where(Circuit.id == circuit_id, Circuit.owner_id == owner_id)
    if lock:
        query = query.with_for_update()
    return session.scalar(query)


def get_revision(session: Session, circuit_id: UUID, revision: int) -> CircuitRevision | None:
    return session.scalar(
        select(CircuitRevision).where(
            CircuitRevision.circuit_id == circuit_id,
            CircuitRevision.revision == revision,
        )
    )
