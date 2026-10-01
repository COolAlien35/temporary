import json
from base64 import b64decode, urlsafe_b64encode
from binascii import Error as Base64Error
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import ApiHTTPException
from app.integrations.quantum.contract import UnsupportedCircuit, ideal_measurement_qubits
from app.modules.circuits.public import owned_revision
from app.modules.circuits.schemas import CircuitSnapshot
from app.modules.experiments.models import ExperimentRun
from app.modules.experiments.repository import (
    count_owned_runs_since,
    get_owned_run,
    get_run_by_key,
    list_owned_runs,
)
from app.modules.experiments.schemas import RunCreate, RunPage, RunRead, RunSummary
from app.modules.identity.public import Actor
from app.modules.jobs.public import enqueue_job, owned_job_state, owned_job_summaries
from app.modules.predictions.public import bind_prediction


def _request_hash(body: RunCreate) -> str:
    encoded = json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return sha256(encoded.encode()).hexdigest()


def _owner_lock(actor_id: UUID) -> int:
    digest = sha256(b"aer-daily-quota:" + actor_id.bytes).digest()
    return int.from_bytes(digest[:8], "big", signed=True)


def create_run(
    session: Session, actor: Actor, body: RunCreate, key: UUID, settings: Settings
) -> UUID:
    request_hash = _request_hash(body)
    with session.begin():
        # Serialize an owner's submissions across keys before checking the durable quota.
        session.execute(select(func.pg_advisory_xact_lock(_owner_lock(actor.id))))
        existing = get_run_by_key(session, actor.id, key)
        if existing is not None:
            if existing.request_hash != request_hash:
                raise ApiHTTPException(409, "idempotency_conflict", "Idempotency key already used")
            return existing.id
        now = datetime.now(UTC)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if (
            count_owned_runs_since(session, actor.id, day_start)
            >= settings.simulation_daily_run_limit
        ):
            retry_after = int(((day_start + timedelta(days=1)) - now).total_seconds()) + 1
            raise ApiHTTPException(
                429,
                "simulation_daily_limit",
                "Daily Aer run limit reached",
                headers={"Retry-After": str(retry_after)},
            )
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


def _decode_cursor(cursor: str | None) -> tuple[datetime, UUID] | None:
    if cursor is None:
        return None
    try:
        if not 1 <= len(cursor) <= 256:
            raise ValueError
        raw = b64decode(cursor + "=" * (-len(cursor) % 4), altchars=b"-_", validate=True)
        value = json.loads(raw)
        if not isinstance(value, dict) or set(value) != {"created_at", "id"}:
            raise ValueError
        created_at = datetime.fromisoformat(value["created_at"])
        if created_at.tzinfo is None or created_at.utcoffset() is None:
            raise ValueError
        return created_at, UUID(value["id"])
    except (ValueError, TypeError, KeyError, Base64Error, UnicodeDecodeError):
        raise ApiHTTPException(422, "invalid_cursor", "Invalid run cursor") from None


def list_runs(session: Session, actor: Actor, limit: int, cursor: str | None) -> RunPage:
    rows = list_owned_runs(session, actor.id, limit + 1, _decode_cursor(cursor))
    visible = rows[:limit]
    statuses = owned_job_summaries(session, actor, [run.id for run in visible])
    items = []
    for run in visible:
        job = statuses.get(run.id)
        if job is None:
            raise RuntimeError("Experiment run is missing its job")
        items.append(
            RunSummary(
                id=run.id,
                status=job.status,
                error_code=job.error_code,
                circuit_id=run.circuit_id,
                circuit_revision=run.circuit_revision,
                backend=run.backend,
                shots=run.shots,
                prediction_id=run.prediction_id,
                created_at=run.created_at,
            )
        )
    next_cursor = None
    if len(rows) > limit and visible:
        last = visible[-1]
        payload = json.dumps({"created_at": last.created_at.isoformat(), "id": str(last.id)})
        next_cursor = urlsafe_b64encode(payload.encode()).decode().rstrip("=")
    return RunPage(items=items, next_cursor=next_cursor)
