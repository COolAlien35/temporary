from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, or_, select
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


def list_owned_circuits(
    session: Session,
    owner_id: UUID,
    limit: int,
    before: tuple[datetime, UUID] | None,
    archived: bool = False,
) -> list[tuple[Circuit, CircuitRevision]]:
    query = (
        select(Circuit, CircuitRevision)
        .join(
            CircuitRevision,
            and_(
                CircuitRevision.circuit_id == Circuit.id,
                CircuitRevision.revision == Circuit.current_revision,
            ),
        )
        .where(Circuit.owner_id == owner_id, Circuit.archived.is_(archived))
        .order_by(Circuit.updated_at.desc(), Circuit.id.desc())
        .limit(limit)
    )
    if before is not None:
        updated_at, circuit_id = before
        query = query.where(
            or_(
                Circuit.updated_at < updated_at,
                and_(Circuit.updated_at == updated_at, Circuit.id < circuit_id),
            )
        )
    return [(circuit, revision) for circuit, revision in session.execute(query)]
