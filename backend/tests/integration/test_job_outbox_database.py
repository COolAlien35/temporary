from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from celery.result import AsyncResult
from fastapi.testclient import TestClient
from kombu.exceptions import OperationalError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.jobs.celery_app import celery_app
from app.main import create_app
from app.modules.identity.models import Profile
from app.modules.identity.public import Actor, IdentityClaims, get_claims
from app.modules.jobs.dispatcher import dispatch_once
from app.modules.jobs.execution import claim_job, finish_job
from app.modules.jobs.models import Job, JobOutbox
from app.modules.jobs.outbox import create_dispatchable_job, dispatch_pending
from app.modules.jobs.reconciliation import reconcile_expired, reconcile_unclaimed
from app.modules.jobs.repository import get_outbox_for_job
from app.modules.jobs.service import JobTransitionConflict, create_job, transition_job

pytestmark = pytest.mark.integration


def test_outbox_retries_broker_failure_and_delivers_to_real_worker():
    subject = uuid4()
    app = create_app()
    app.dependency_overrides[get_claims] = lambda: IdentityClaims(subject, "outbox@example.test")
    engine = get_engine()
    owner_id: UUID | None = None
    try:
        with TestClient(app) as client:
            profile = client.get("/api/v1/me")
            assert profile.status_code == 200
            owner = Actor(UUID(profile.json()["id"]), "outbox@example.test", "learner")
            owner_id = owner.id
            with Session(engine) as session:
                job_id = create_dispatchable_job(
                    session, owner, kind="export", task_name="quantumloop.jobs.probe"
                ).id
            with Session(engine) as session:
                message = get_outbox_for_job(session, job_id)
                assert message is not None
                assert message.published_at is None
                assert message.attempts == 0
            with Session(engine) as session:

                def broker_down(_message: JobOutbox, _job: Job) -> None:
                    raise OperationalError("simulated broker outage")

                result = dispatch_pending(session, publisher=broker_down)
                assert result.retried == 1
            with Session(engine) as session:
                message = get_outbox_for_job(session, job_id)
                assert message is not None
                assert message.attempts == 1
                assert message.last_error_code == "broker_unavailable"
                retry_at = message.next_attempt_at
            with Session(engine) as session:
                assert dispatch_pending(session, publisher=broker_down).retried == 0
            result = dispatch_once(now=retry_at + timedelta(seconds=1))
            assert result.published == 1
            receipt = AsyncResult(str(job_id), app=celery_app)
            try:
                assert receipt.get(timeout=30) == "succeeded"
            finally:
                receipt.forget()
            with Session(engine) as session:
                completed = session.get(Job, job_id)
                assert completed is not None
                assert completed.status == "succeeded"
                assert completed.result_summary == {"diagnostic": "ok"}
                assert completed.attempt_count == 1
                assert completed.lease_token is None
            completed_response = client.get(f"/api/v1/jobs/{job_id}")
            assert completed_response.status_code == 200
            assert completed_response.json()["status"] == "succeeded"
            assert completed_response.json()["result_summary"] == {"diagnostic": "ok"}
            duplicate = celery_app.send_task(
                "quantumloop.jobs.probe",
                task_id=str(uuid4()),
                queue="maintenance",
                kwargs={"job_id": str(job_id)},
                ignore_result=False,
            )
            try:
                assert duplicate.get(timeout=30) == "ignored"
            finally:
                duplicate.forget()
            with Session(engine) as session:
                completed = session.get(Job, job_id)
                assert completed is not None
                assert completed.status == "succeeded"
                assert completed.attempt_count == 1
            with Session(engine) as session:
                message = get_outbox_for_job(session, job_id)
                assert message is not None
                assert message.published_at is not None
                assert message.attempts == 2
            with Session(engine) as session:
                assert dispatch_pending(session, now=retry_at + timedelta(seconds=2)).published == 0

            with Session(engine) as session:
                cancelled_id = create_dispatchable_job(
                    session, owner, kind="export", task_name="quantumloop.jobs.probe"
                ).id
            with Session(engine) as session:
                transition_job(session, cancelled_id, "queued", "cancelled")
            with Session(engine) as session:
                assert dispatch_pending(session).discarded == 1
            with Session(engine) as session:
                cancelled_message = get_outbox_for_job(session, cancelled_id)
                assert cancelled_message is not None
                assert cancelled_message.discarded_at is not None
                assert cancelled_message.published_at is None

            with Session(engine) as session:
                fenced_id = create_job(session, owner, "export").id
            base_time = datetime.now(UTC)
            with Session(engine) as session:
                first_lease = claim_job(session, fenced_id, lease_seconds=2, now=base_time)
            assert first_lease is not None
            with Session(engine) as session:
                assert (
                    claim_job(
                        session,
                        fenced_id,
                        lease_seconds=2,
                        retry_expired=True,
                        now=base_time + timedelta(seconds=1),
                    )
                    is None
                )
            with Session(engine) as session:
                second_lease = claim_job(
                    session,
                    fenced_id,
                    lease_seconds=2,
                    retry_expired=True,
                    now=base_time + timedelta(seconds=3),
                )
            assert second_lease is not None
            assert second_lease.token != first_lease.token
            with Session(engine) as session, pytest.raises(JobTransitionConflict):
                finish_job(
                    session,
                    first_lease,
                    "succeeded",
                    result_summary={"diagnostic": "stale"},
                    now=base_time + timedelta(seconds=3),
                )
            with Session(engine) as session, pytest.raises(JobTransitionConflict):
                transition_job(session, fenced_id, "running", "succeeded")
            with Session(engine) as session:
                current = finish_job(
                    session,
                    second_lease,
                    "succeeded",
                    result_summary={"diagnostic": "current"},
                    now=base_time + timedelta(seconds=3),
                )
                assert current.attempt_count == 2
                assert current.result_summary == {"diagnostic": "current"}

            with Session(engine) as session:
                cancelled_running_id = create_job(session, owner, "export").id
            with Session(engine) as session:
                cancelled_lease = claim_job(session, cancelled_running_id, lease_seconds=10)
            assert cancelled_lease is not None
            with Session(engine) as session:
                transition_job(session, cancelled_running_id, "running", "cancelled")
            with Session(engine) as session, pytest.raises(JobTransitionConflict):
                finish_job(session, cancelled_lease, "succeeded")
    finally:
        app.dependency_overrides.clear()
        with Session(engine) as session, session.begin():
            if owner_id is not None:
                session.execute(
                    delete(JobOutbox).where(
                        JobOutbox.job_id.in_(select(Job.id).where(Job.owner_id == owner_id))
                    )
                )
                session.execute(delete(Job).where(Job.owner_id == owner_id))
            session.execute(delete(Profile).where(Profile.auth_subject == subject))


def test_reconciler_replays_only_safe_expired_jobs_and_caps_attempts():
    subject = uuid4()
    app = create_app()
    app.dependency_overrides[get_claims] = lambda: IdentityClaims(subject, "recovery@example.test")
    engine = get_engine()
    owner_id: UUID | None = None
    try:
        with TestClient(app) as client:
            profile = client.get("/api/v1/me")
            assert profile.status_code == 200
            owner = Actor(UUID(profile.json()["id"]), "recovery@example.test", "learner")
            owner_id = owner.id
            now = datetime.now(UTC)
            past = now - timedelta(seconds=20)

            with Session(engine) as session:
                safe_id = create_dispatchable_job(
                    session, owner, kind="export", task_name="quantumloop.jobs.probe"
                ).id
            with Session(engine) as session:
                abandoned_lease = claim_job(session, safe_id, lease_seconds=1, now=past)
            assert abandoned_lease is not None
            with Session(engine) as session, session.begin():
                message = get_outbox_for_job(session, safe_id)
                assert message is not None
                message.published_at = past

            with Session(engine) as session:
                capped_id = create_dispatchable_job(
                    session, owner, kind="export", task_name="quantumloop.jobs.probe"
                ).id
            for offset in (0, 2, 4):
                with Session(engine) as session:
                    lease = claim_job(
                        session,
                        capped_id,
                        lease_seconds=1,
                        retry_expired=True,
                        now=past + timedelta(seconds=offset),
                    )
                    assert lease is not None

            with Session(engine) as session:
                uncertain_id = create_job(session, owner, "export").id
            with Session(engine) as session, session.begin():
                session.add(
                    JobOutbox(
                        job_id=uncertain_id,
                        task_name="quantumloop.provider.submit",
                        payload={"job_id": str(uncertain_id)},
                        published_at=past,
                    )
                )
            with Session(engine) as session:
                uncertain_lease = claim_job(session, uncertain_id, lease_seconds=1, now=past)
            assert uncertain_lease is not None

            with Session(engine) as session:
                recovered = reconcile_expired(session, now=now)
            assert recovered.requeued == 1
            assert recovered.timed_out == 1
            assert recovered.unknown == 1
            with Session(engine) as session:
                assert reconcile_expired(session, now=now).requeued == 0
            with Session(engine) as session:
                safe = session.get(Job, safe_id)
                capped = session.get(Job, capped_id)
                uncertain = session.get(Job, uncertain_id)
                assert safe is not None and safe.status == "queued"
                assert safe.lease_token is None
                assert capped is not None and capped.status == "timed_out"
                assert capped.error_code == "attempt_limit"
                assert uncertain is not None and uncertain.status == "unknown"
                assert uncertain.error_code == "reconciliation_required"
                safe_message = get_outbox_for_job(session, safe_id)
                capped_message = get_outbox_for_job(session, capped_id)
                uncertain_message = get_outbox_for_job(session, uncertain_id)
                assert safe_message is not None and safe_message.published_at is None
                assert capped_message is not None and capped_message.discarded_at is not None
                assert uncertain_message is not None and uncertain_message.discarded_at is not None

            assert dispatch_once().published == 1
            receipt = AsyncResult(str(safe_id), app=celery_app)
            try:
                assert receipt.get(timeout=30) == "succeeded"
            finally:
                receipt.forget()
            with Session(engine) as session:
                safe = session.get(Job, safe_id)
                assert safe is not None
                assert safe.status == "succeeded"
                assert safe.attempt_count == 2
                assert safe.result_summary == {"diagnostic": "ok"}
            with Session(engine) as session, pytest.raises(JobTransitionConflict):
                finish_job(session, abandoned_lease, "succeeded")
    finally:
        app.dependency_overrides.clear()
        with Session(engine) as session, session.begin():
            if owner_id is not None:
                session.execute(
                    delete(JobOutbox).where(
                        JobOutbox.job_id.in_(select(Job.id).where(Job.owner_id == owner_id))
                    )
                )
                session.execute(delete(Job).where(Job.owner_id == owner_id))
            session.execute(delete(Profile).where(Profile.auth_subject == subject))


def test_reconciler_recovers_published_jobs_that_no_worker_claimed():
    subject = uuid4()
    app = create_app()
    app.dependency_overrides[get_claims] = lambda: IdentityClaims(subject, "unclaimed@example.test")
    engine = get_engine()
    owner_id: UUID | None = None
    try:
        with TestClient(app) as client:
            profile = client.get("/api/v1/me")
            assert profile.status_code == 200
            owner = Actor(UUID(profile.json()["id"]), "unclaimed@example.test", "learner")
            owner_id = owner.id
            now = datetime.now(UTC)
            stale_at = now - timedelta(seconds=20)

            with Session(engine) as session:
                safe_id = create_dispatchable_job(
                    session, owner, kind="export", task_name="quantumloop.jobs.probe"
                ).id
            with Session(engine) as session, session.begin():
                message = get_outbox_for_job(session, safe_id)
                assert message is not None
                message.published_at = stale_at
                message.publication_count = 1
                message.attempts = 1

            with Session(engine) as session:
                capped_id = create_dispatchable_job(
                    session, owner, kind="export", task_name="quantumloop.jobs.probe"
                ).id
            with Session(engine) as session, session.begin():
                message = get_outbox_for_job(session, capped_id)
                assert message is not None
                message.published_at = stale_at
                message.publication_count = 3
                message.attempts = 3

            with Session(engine) as session:
                uncertain_id = create_job(session, owner, "export").id
            with Session(engine) as session, session.begin():
                session.add(
                    JobOutbox(
                        job_id=uncertain_id,
                        task_name="quantumloop.provider.submit",
                        payload={"job_id": str(uncertain_id)},
                        published_at=stale_at,
                        publication_count=1,
                    )
                )

            with Session(engine) as session:
                fresh_id = create_dispatchable_job(
                    session, owner, kind="export", task_name="quantumloop.jobs.probe"
                ).id
            with Session(engine) as session, session.begin():
                message = get_outbox_for_job(session, fresh_id)
                assert message is not None
                message.published_at = now
                message.publication_count = 1

            with Session(engine) as session:
                recovered = reconcile_unclaimed(session, grace_seconds=5, now=now)
            assert recovered.requeued == 1
            assert recovered.timed_out == 1
            assert recovered.unknown == 1
            with Session(engine) as session:
                assert reconcile_unclaimed(session, grace_seconds=5, now=now).requeued == 0
            with Session(engine) as session:
                safe_message = get_outbox_for_job(session, safe_id)
                fresh_message = get_outbox_for_job(session, fresh_id)
                capped = session.get(Job, capped_id)
                uncertain = session.get(Job, uncertain_id)
                assert safe_message is not None and safe_message.published_at is None
                assert safe_message.publication_count == 1
                assert fresh_message is not None and fresh_message.published_at == now
                assert capped is not None and capped.status == "timed_out"
                assert capped.error_code == "start_timeout"
                assert uncertain is not None and uncertain.status == "unknown"
                assert uncertain.error_code == "reconciliation_required"

            assert dispatch_once().published == 1
            receipt = AsyncResult(str(safe_id), app=celery_app)
            try:
                assert receipt.get(timeout=30) == "succeeded"
            finally:
                receipt.forget()
            with Session(engine) as session:
                safe = session.get(Job, safe_id)
                safe_message = get_outbox_for_job(session, safe_id)
                assert safe is not None and safe.status == "succeeded"
                assert safe.attempt_count == 1
                assert safe_message is not None and safe_message.publication_count == 2
            assert client.get(f"/api/v1/jobs/{safe_id}").json()["status"] == "succeeded"
    finally:
        app.dependency_overrides.clear()
        with Session(engine) as session, session.begin():
            if owner_id is not None:
                session.execute(
                    delete(JobOutbox).where(
                        JobOutbox.job_id.in_(select(Job.id).where(Job.owner_id == owner_id))
                    )
                )
                session.execute(delete(Job).where(Job.owner_id == owner_id))
            session.execute(delete(Profile).where(Profile.auth_subject == subject))
