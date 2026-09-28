from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.main import create_app
from app.modules.identity.models import Profile
from app.modules.identity.public import Actor, IdentityClaims, get_claims
from app.modules.jobs.models import Job
from app.modules.jobs.service import JobTransitionConflict, create_job, transition_job

pytestmark = pytest.mark.integration


def test_durable_jobs_are_owner_scoped_and_terminal_writes_are_fenced():
    subjects = [uuid4(), uuid4()]
    current = IdentityClaims(subjects[0], "job-owner@example.test")
    app = create_app()
    app.dependency_overrides[get_claims] = lambda: current
    engine = get_engine()
    owner_id: UUID | None = None
    try:
        with TestClient(app) as client:
            first = client.get("/api/v1/me")
            assert first.status_code == 200
            owner = Actor(UUID(first.json()["id"]), current.email, "learner")
            owner_id = owner.id
            current = IdentityClaims(subjects[1], "other-job-user@example.test")
            assert client.get("/api/v1/me").status_code == 200

            with Session(engine) as session:
                job_id = create_job(session, owner, "simulation").id
            assert client.get(f"/api/v1/jobs/{job_id}").status_code == 404
            assert client.get(f"/api/v1/jobs/{uuid4()}").status_code == 404

            current = IdentityClaims(subjects[0], "job-owner@example.test")
            queued = client.get(f"/api/v1/jobs/{job_id}")
            assert queued.status_code == 200
            assert queued.json()["status"] == "queued"
            assert queued.json()["frontend_status"] == "queued"
            assert queued.json()["started_at"] is None

            with Session(engine) as session:
                running = transition_job(session, job_id, "queued", "running")
                assert running.started_at is not None
            with Session(engine) as session:
                transition_job(session, job_id, "running", "unknown")
            unknown = client.get(f"/api/v1/jobs/{job_id}")
            assert unknown.json()["status"] == "unknown"
            assert unknown.json()["frontend_status"] == "running"

            result = {"counts": {"0": 8, "1": 2}}
            with Session(engine) as session:
                completed = transition_job(
                    session, job_id, "unknown", "succeeded", result_summary=result
                )
                finished_at = completed.finished_at
            assert finished_at is not None
            with Session(engine) as session:
                replay = transition_job(
                    session, job_id, "unknown", "succeeded", result_summary=result
                )
                assert replay.finished_at == finished_at
            with Session(engine) as session, pytest.raises(JobTransitionConflict):
                transition_job(
                    session,
                    job_id,
                    "unknown",
                    "succeeded",
                    result_summary={"counts": {"0": 10}},
                )
            with Session(engine) as session, pytest.raises(JobTransitionConflict):
                transition_job(session, job_id, "running", "failed", error_code="stale_worker")
            completed_response = client.get(f"/api/v1/jobs/{job_id}")
            assert completed_response.json()["status"] == "succeeded"
            assert completed_response.json()["frontend_status"] == "completed"
            assert completed_response.json()["result_summary"] == result

            for target, expected, error_code in (
                ("cancelled", "queued", None),
                ("failed", "running", "provider_unavailable"),
                ("timed_out", "running", "time_limit"),
            ):
                with Session(engine) as session:
                    other_id = create_job(session, owner, "export").id
                if expected == "running":
                    with Session(engine) as session:
                        transition_job(session, other_id, "queued", "running")
                with Session(engine) as session:
                    transition_job(session, other_id, expected, target, error_code=error_code)
                response = client.get(f"/api/v1/jobs/{other_id}")
                assert response.json()["status"] == target
                assert response.json()["frontend_status"] == "failed"
                assert response.json()["finished_at"] is not None

            with Session(engine) as session, pytest.raises(ValueError):
                transition_job(session, job_id, "succeeded", "running")
            with Session(engine) as session, pytest.raises(ValueError):
                transition_job(
                    session,
                    job_id,
                    "unknown",
                    "succeeded",
                    result_summary={"oversized": "x" * 20_000},
                )
    finally:
        app.dependency_overrides.clear()
        with Session(engine) as session, session.begin():
            if owner_id is not None:
                session.execute(delete(Job).where(Job.owner_id == owner_id))
            session.execute(delete(Profile).where(Profile.auth_subject.in_(subjects)))
