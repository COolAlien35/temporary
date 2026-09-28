import json
from base64 import b64decode, urlsafe_b64encode
from binascii import Error as Base64Error
from datetime import datetime
from hashlib import sha256
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.modules.circuits.models import Circuit, CircuitRevision
from app.modules.circuits.repository import get_owned_circuit, get_revision, list_owned_circuits
from app.modules.circuits.schemas import (
    CircuitDraft,
    CircuitPage,
    CircuitRead,
    CircuitSnapshot,
    CircuitSummary,
)
from app.modules.identity.public import Actor


def snapshot_and_hash(body: CircuitDraft) -> tuple[dict[str, object], str]:
    snapshot = body.canonical_snapshot()
    encoded = json.dumps(snapshot, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return snapshot, sha256(encoded.encode()).hexdigest()


def circuit_read(circuit: Circuit, revision: CircuitRevision) -> CircuitRead:
    return CircuitRead.model_validate(
        {
            "id": circuit.id,
            "revision": revision.revision,
            "snapshot": revision.snapshot,
            "checksum_sha256": revision.checksum_sha256,
            "created_at": circuit.created_at,
            "updated_at": circuit.updated_at,
        }
    )


def create_circuit(session: Session, actor: Actor, body: CircuitDraft, key: UUID) -> CircuitRead:
    snapshot, checksum = snapshot_and_hash(body)
    with session.begin():
        existing = session.scalar(
            select(Circuit).where(Circuit.owner_id == actor.id, Circuit.idempotency_key == key)
        )
        if existing is not None:
            if existing.request_hash != checksum:
                raise ApiHTTPException(409, "idempotency_conflict", "Idempotency key already used")
            revision = get_revision(session, existing.id, existing.current_revision)
            assert revision is not None
            return circuit_read(existing, revision)
        created_id = session.scalar(
            insert(Circuit)
            .values(
                id=uuid4(),
                owner_id=actor.id,
                name=body.name,
                current_revision=1,
                idempotency_key=key,
                request_hash=checksum,
            )
            .on_conflict_do_nothing(index_elements=[Circuit.owner_id, Circuit.idempotency_key])
            .returning(Circuit.id)
        )
        if created_id is None:
            existing = session.scalar(
                select(Circuit).where(Circuit.owner_id == actor.id, Circuit.idempotency_key == key)
            )
            assert existing is not None
            if existing.request_hash != checksum:
                raise ApiHTTPException(409, "idempotency_conflict", "Idempotency key already used")
            revision = get_revision(session, existing.id, existing.current_revision)
            assert revision is not None
            return circuit_read(existing, revision)
        session.add(
            CircuitRevision(
                circuit_id=created_id,
                revision=1,
                snapshot=snapshot,
                checksum_sha256=checksum,
            )
        )
        session.flush()
        circuit = session.get_one(Circuit, created_id)
        revision = get_revision(session, created_id, 1)
        assert revision is not None
        result = circuit_read(circuit, revision)
    return result


def read_circuit(session: Session, actor: Actor, circuit_id: UUID) -> CircuitRead:
    circuit = get_owned_circuit(session, circuit_id, actor.id)
    if circuit is None:
        raise HTTPException(status_code=404, detail="Circuit not found")
    revision = get_revision(session, circuit.id, circuit.current_revision)
    assert revision is not None
    return circuit_read(circuit, revision)


def _decode_cursor(cursor: str | None) -> tuple[datetime, UUID] | None:
    if cursor is None:
        return None
    try:
        if not 1 <= len(cursor) <= 256:
            raise ValueError
        raw = b64decode(cursor + "=" * (-len(cursor) % 4), altchars=b"-_", validate=True)
        value = json.loads(raw)
        if not isinstance(value, dict) or set(value) != {"updated_at", "id"}:
            raise ValueError
        updated_at = datetime.fromisoformat(value["updated_at"])
        if updated_at.tzinfo is None or updated_at.utcoffset() is None:
            raise ValueError
        return updated_at, UUID(value["id"])
    except (ValueError, TypeError, KeyError, Base64Error, UnicodeDecodeError):
        raise ApiHTTPException(422, "invalid_cursor", "Invalid circuit cursor") from None


def list_circuits(session: Session, actor: Actor, limit: int, cursor: str | None) -> CircuitPage:
    rows = list_owned_circuits(session, actor.id, limit + 1, _decode_cursor(cursor))
    visible = rows[:limit]
    items = []
    for circuit, revision in visible:
        snapshot = CircuitSnapshot.model_validate(revision.snapshot)
        items.append(
            CircuitSummary(
                id=circuit.id,
                name=circuit.name,
                revision=circuit.current_revision,
                qubits=snapshot.qubits,
                gate_count=len(snapshot.gates),
                checksum_sha256=revision.checksum_sha256,
                created_at=circuit.created_at,
                updated_at=circuit.updated_at,
            )
        )
    next_cursor = None
    if len(rows) > limit and visible:
        last = visible[-1][0]
        payload = json.dumps({"updated_at": last.updated_at.isoformat(), "id": str(last.id)})
        next_cursor = urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    return CircuitPage(items=items, next_cursor=next_cursor)


def read_circuit_revision(
    session: Session, actor: Actor, circuit_id: UUID, revision_number: int
) -> CircuitRead:
    circuit = get_owned_circuit(session, circuit_id, actor.id)
    if circuit is None:
        raise HTTPException(status_code=404, detail="Circuit not found")
    revision = get_revision(session, circuit.id, revision_number)
    if revision is None:
        raise HTTPException(status_code=404, detail="Circuit revision not found")
    return circuit_read(circuit, revision)


def update_circuit(
    session: Session,
    actor: Actor,
    circuit_id: UUID,
    body: CircuitDraft,
    expected_revision: int,
) -> CircuitRead:
    snapshot, checksum = snapshot_and_hash(body)
    with session.begin():
        circuit = get_owned_circuit(session, circuit_id, actor.id, lock=True)
        if circuit is None:
            raise HTTPException(status_code=404, detail="Circuit not found")
        if circuit.current_revision != expected_revision:
            raise ApiHTTPException(
                412,
                "revision_conflict",
                "Circuit has changed; reload before saving",
                headers={"ETag": f'"rev-{circuit.current_revision}"'},
            )
        current = get_revision(session, circuit.id, circuit.current_revision)
        assert current is not None
        if current.checksum_sha256 == checksum:
            return circuit_read(circuit, current)
        next_revision = circuit.current_revision + 1
        session.add(
            CircuitRevision(
                circuit_id=circuit.id,
                revision=next_revision,
                snapshot=snapshot,
                checksum_sha256=checksum,
            )
        )
        circuit.name = body.name
        circuit.current_revision = next_revision
        session.flush()
        session.refresh(circuit)
        created = get_revision(session, circuit.id, next_revision)
        assert created is not None
        result = circuit_read(circuit, created)
    return result
