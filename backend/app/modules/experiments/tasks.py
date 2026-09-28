"""Fenced local simulation worker; no client-provided result enters this path."""

import logging
from dataclasses import asdict
from uuid import UUID

from app.core.config import get_settings
from app.db.session import worker_session
from app.integrations.quantum.aer import run_aer
from app.jobs.celery_app import celery_app
from app.modules.circuits.schemas import CircuitSnapshot
from app.modules.experiments.models import ExperimentRun
from app.modules.jobs.public import JobTransitionConflict, claim_job, finish_job

logger = logging.getLogger(__name__)


@celery_app.task(  # type: ignore[untyped-decorator]
    name="quantumloop.experiments.run_aer", ignore_result=False, acks_late=False
)
def run_aer_job(job_id: str) -> str:
    identifier = UUID(job_id)
    with worker_session() as session:
        lease = claim_job(
            session,
            identifier,
            lease_seconds=get_settings().task_time_limit + 1,
            retry_expired=True,
        )
    if lease is None:
        return "ignored"
    try:
        with worker_session() as session:
            run = session.get(ExperimentRun, identifier)
            if run is None:
                raise LookupError("Experiment run is missing")
            snapshot = CircuitSnapshot.model_validate(run.snapshot)
            shots, seed = run.shots, run.seed
        result = run_aer(snapshot, shots=shots, seed=seed)
        summary = asdict(result)
        # Counts and shots already give exact sampled frequencies on demand.
        summary.pop("sampled_frequencies")
        if snapshot.qubits > 5:
            summary.pop("statevector")
        with worker_session() as session:
            finish_job(session, lease, "succeeded", result_summary=summary)
        return "succeeded"
    except JobTransitionConflict:
        return "ignored"
    except Exception:
        logger.exception("Local Aer simulation failed for job %s", identifier)
        try:
            with worker_session() as session:
                finish_job(session, lease, "failed", error_code="simulation_failed")
        except JobTransitionConflict:
            return "ignored"
        return "failed"
