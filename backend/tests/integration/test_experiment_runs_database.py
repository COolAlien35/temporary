from uuid import UUID, uuid4

import pytest
from celery.result import AsyncResult
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import get_engine
from app.jobs.celery_app import celery_app
from app.main import create_app
from app.modules.circuits.models import Circuit
from app.modules.experiments.models import ExperimentRun
from app.modules.identity.models import Profile
from app.modules.identity.public import IdentityClaims, get_claims
from app.modules.jobs.dispatcher import dispatch_once
from app.modules.jobs.models import Job, JobOutbox

pytestmark = pytest.mark.integration


def test_owned_immutable_aer_run_reaches_real_worker_and_replays_safely() -> None:
    first_subject, second_subject = uuid4(), uuid4()
    current = IdentityClaims(first_subject, "aer-first@example.test")
    app = create_app(Settings(simulation_daily_run_limit=1))
    app.dependency_overrides[get_claims] = lambda: current
    circuit_id: UUID | None = None
    run_id: UUID | None = None
    try:
        with TestClient(app) as client:
            assert client.get("/api/v1/me").status_code == 200
            circuit_body = {
                "name": "Bell",
                "qubits": 2,
                "gates": [
                    {"id": "h", "type": "H", "step": 0, "qubit": 0},
                    {"id": "cx", "type": "CNOT", "step": 1, "qubit": 0, "target": 1},
                ],
            }
            created = client.post(
                "/api/v1/circuits",
                json=circuit_body,
                headers={"Idempotency-Key": str(uuid4())},
            )
            assert created.status_code == 201, created.text
            circuit_id = UUID(created.json()["id"])
            body = {
                "circuit_id": str(circuit_id),
                "circuit_revision": 1,
                "backend": "qiskit_aer",
                "shots": 1024,
                "seed": 11,
            }
            key = str(uuid4())
            accepted = client.post(
                "/api/v1/experiments/runs",
                json=body,
                headers={"Idempotency-Key": key},
            )
            assert accepted.status_code == 202, accepted.text
            run_id = UUID(accepted.json()["resource_id"])
            assert accepted.json()["job_id"] == str(run_id)
            assert accepted.headers["Location"] == f"/api/v1/jobs/{run_id}"
            assert accepted.headers["Retry-After"] == "2"
            queued = client.get(f"/api/v1/experiments/runs/{run_id}")
            assert queued.status_code == 200
            assert queued.json()["status"] == "queued"
            assert "result" not in queued.json()
            replay = client.post(
                "/api/v1/experiments/runs",
                json=body,
                headers={"Idempotency-Key": key},
            )
            assert replay.status_code == 202
            assert replay.json()["job_id"] == str(run_id)
            conflict = client.post(
                "/api/v1/experiments/runs",
                json={**body, "shots": 100},
                headers={"Idempotency-Key": key},
            )
            assert conflict.status_code == 409
            assert conflict.json()["error"]["code"] == "idempotency_conflict"
            limited = client.post(
                "/api/v1/experiments/runs",
                json=body,
                headers={"Idempotency-Key": str(uuid4())},
            )
            assert limited.status_code == 429
            assert limited.json()["error"]["code"] == "simulation_daily_limit"
            assert dispatch_once().published == 1
            receipt = AsyncResult(str(run_id), app=celery_app)
            try:
                assert receipt.get(timeout=60) == "succeeded"
            finally:
                receipt.forget()
            completed = client.get(f"/api/v1/experiments/runs/{run_id}")
            assert completed.status_code == 200
            data = completed.json()
            assert data["status"] == "succeeded"
            assert data["circuit_revision"] == 1
            assert data["circuit_snapshot"] == created.json()["snapshot"]
            assert data["checksum_sha256"] == created.json()["checksum_sha256"]
            result = data["result"]
            assert result["backend"] == "qiskit_aer"
            assert result["measurement_qubits"] == [1, 0]
            assert result["exact_probabilities"]["00"] == pytest.approx(0.5)
            assert result["exact_probabilities"]["11"] == pytest.approx(0.5)
            assert sum(result["counts"].values()) == 1024
            assert client.get(f"/api/v1/jobs/{run_id}").json()["status"] == "succeeded"

            changed = client.put(
                f"/api/v1/circuits/{circuit_id}",
                json={**circuit_body, "name": "Edited"},
                headers={"If-Match": created.headers["ETag"]},
            )
            assert changed.status_code == 200
            assert (
                client.get(f"/api/v1/experiments/runs/{run_id}").json()["circuit_snapshot"]
                == created.json()["snapshot"]
            )

            duplicate = celery_app.send_task(
                "quantumloop.experiments.run_aer",
                task_id=str(uuid4()),
                queue="simulation",
                kwargs={"job_id": str(run_id)},
                ignore_result=False,
            )
            try:
                assert duplicate.get(timeout=60) == "ignored"
            finally:
                duplicate.forget()

            current = IdentityClaims(second_subject, "aer-second@example.test")
            assert client.get("/api/v1/me").status_code == 200
            assert client.get(f"/api/v1/experiments/runs/{run_id}").status_code == 404
            forbidden = client.post(
                "/api/v1/experiments/runs",
                json=body,
                headers={"Idempotency-Key": str(uuid4())},
            )
            assert forbidden.status_code == 404
            with Session(get_engine()) as db:
                runs = db.scalars(select(ExperimentRun).where(ExperimentRun.id == run_id)).all()
                assert len(runs) == 1
                assert runs[0].owner_id != UUID(client.get("/api/v1/me").json()["id"])
    finally:
        app.dependency_overrides.clear()
        with Session(get_engine()) as db, db.begin():
            if run_id is not None:
                db.execute(delete(ExperimentRun).where(ExperimentRun.id == run_id))
                db.execute(delete(JobOutbox).where(JobOutbox.job_id == run_id))
                db.execute(delete(Job).where(Job.id == run_id))
            if circuit_id is not None:
                db.execute(delete(Circuit).where(Circuit.id == circuit_id))
            db.execute(
                delete(Profile).where(Profile.auth_subject.in_([first_subject, second_subject]))
            )
