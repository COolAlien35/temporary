import json
from hashlib import sha256
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.integrations.quantum.contract import UnsupportedCircuit, ideal_measurement_qubits
from app.modules.circuits.public import owned_revision
from app.modules.circuits.schemas import CircuitSnapshot
from app.modules.experiments.models import ExperimentRun
from app.modules.experiments.repository import get_owned_run, get_run_by_key
from app.modules.experiments.schemas import RunCreate, RunRead
from app.modules.identity.public import Actor
from app.modules.jobs.public import enqueue_job, owned_job_state
from app.modules.predictions.public import bind_prediction


def _request_hash(body: RunCreate) -> str:
    encoded = json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return sha256(encoded.encode()).hexdigest()


def _idempotency_lock(actor_id: UUID, key: UUID) -> int:
    digest = sha256(actor_id.bytes + key.bytes).digest()
    return int.from_bytes(digest[:8], "big", signed=True)


def create_run(session: Session, actor: Actor, body: RunCreate, key: UUID) -> UUID:
    request_hash = _request_hash(body)
    with session.begin():
        # Serialize only the same actor/key pair; a unique constraint is the final defense.
        session.execute(select(func.pg_advisory_xact_lock(_idempotency_lock(actor.id, key))))
        existing = get_run_by_key(session, actor.id, key)
        if existing is not None:
            if existing.request_hash != request_hash:
                raise ApiHTTPException(409, "idempotency_conflict", "Idempotency key already used")
            return existing.id
        revision = owned_revision(session, actor.id, body.circuit_id, body.circuit_revision)
        if revision is None:
            raise HTTPException(status_code=404, detail="Circuit revision not found")
        try:
            ideal_measurement_qubits(revision.snapshot)
        except UnsupportedCircuit as exc:
            raise ApiHTTPException(422, "unsupported_circuit", str(exc)) from None
        job = enqueue_job(
            session,
            actor,
            kind="simulation",
            task_name="quantumloop.experiments.run_aer",
        )
        session.add(
            ExperimentRun(
                id=job.id,
                owner_id=actor.id,
                circuit_id=revision.circuit_id,
                circuit_revision=revision.revision,
                snapshot=revision.snapshot.model_dump(mode="json", exclude_none=True),
                checksum_sha256=revision.checksum_sha256,
                backend=body.backend,
                shots=body.shots,
                seed=body.seed,
                prediction_id=body.prediction_id,
                idempotency_key=key,
                request_hash=request_hash,
            )
        )
        session.flush()
        if body.prediction_id is not None:
            bind_prediction(
                session,
                actor,
                body.prediction_id,
                job.id,
                revision.snapshot.qubits,
                ideal_measurement_qubits(revision.snapshot),
            )
        return job.id


def read_run(session: Session, actor: Actor, run_id: UUID) -> RunRead:
    run = get_owned_run(session, run_id, actor.id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    job = owned_job_state(session, actor, run.id)
    return RunRead(
        id=run.id,
        status=job.status,
        error_code=job.error_code,
        circuit_id=run.circuit_id,
        circuit_revision=run.circuit_revision,
        circuit_snapshot=CircuitSnapshot.model_validate(run.snapshot),
        checksum_sha256=run.checksum_sha256,
        backend=run.backend,
        shots=run.shots,
        seed=run.seed,
        prediction_id=run.prediction_id,
        result=job.result_summary if job.status == "succeeded" else None,
        created_at=run.created_at,
    )
