from uuid import UUID, uuid4

import pytest
from celery.result import AsyncResult
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.errors import ApiHTTPException
from app.db.session import get_engine
from app.jobs.celery_app import celery_app
from app.main import create_app
from app.modules.ai_tutor.context import load_tutor_context
from app.modules.circuits.models import Circuit
from app.modules.experiments.models import ExperimentRun
from app.modules.identity.models import Profile
from app.modules.identity.public import Actor, IdentityClaims, get_claims
from app.modules.jobs.dispatcher import dispatch_once
from app.modules.jobs.models import Job, JobOutbox
from app.modules.predictions.models import LearningSession, Prediction

pytestmark = pytest.mark.integration


def test_locked_prediction_pairs_only_with_owned_successful_matching_run() -> None:
    first_subject, second_subject = uuid4(), uuid4()
    current = IdentityClaims(first_subject, "pair-first@example.test")
    app = create_app()
    app.dependency_overrides[get_claims] = lambda: current
    circuit_id = second_circuit_id = session_id = second_session_id = prediction_id = run_id = None
    sampled_prediction_id = sampled_run_id = None
    try:
        with TestClient(app) as client:
            profile = client.get("/api/v1/me")
            assert profile.status_code == 200
            actor = Actor(UUID(profile.json()["id"]), profile.json()["email"], "learner")
            circuit = client.post(
                "/api/v1/circuits",
                headers={"Idempotency-Key": str(uuid4())},
                json={
                    "name": "Plus",
                    "qubits": 1,
                    "gates": [{"id": "h", "type": "H", "step": 0, "qubit": 0}],
                },
            )
            assert circuit.status_code == 201, circuit.text
            circuit_id = circuit.json()["id"]
            learning = client.post(
                "/api/v1/learning-sessions",
                headers={"Idempotency-Key": str(uuid4())},
                json={"lesson_id": "u1-quantum-foundations", "lesson_version": 1},
            )
            assert learning.status_code == 201, learning.text
            session_id = learning.json()["id"]
            history_url = f"/api/v1/learning-sessions/{session_id}/agreement-history"
            empty_history = client.get(history_url)
            assert empty_history.status_code == 200
            assert empty_history.json()["items"] == []
            assert empty_history.json()["unavailable_sources"] == [
                "missed_questions",
                "hints",
                "next_lessons",
            ]
            prediction_key = str(uuid4())
            prediction_body = {
                "schema_version": 1,
                "lesson_id": "u1-quantum-foundations",
                "lesson_version": 1,
                "learning_session_id": session_id,
                "prediction_vector": [0.25, 0.75],
                "basis_labels": ["1", "0"],
                "measurement_qubits": [0],
                "comparison_basis": "ideal_probability",
            }
            prediction = client.post(
                f"/api/v1/learning-sessions/{session_id}/predictions",
                headers={"Idempotency-Key": prediction_key},
                json=prediction_body,
            )
            assert prediction.status_code == 201, prediction.text
            prediction_id = prediction.json()["id"]
            pair_url = f"/api/v1/predictions/{prediction_id}/pair"
            assert client.get(pair_url).status_code == 409
            run_body = {
                "circuit_id": circuit_id,
                "circuit_revision": 1,
                "backend": "qiskit_aer",
                "shots": 256,
                "seed": 7,
                "prediction_id": prediction_id,
            }
            key = str(uuid4())
            run = client.post(
                "/api/v1/experiments/runs", headers={"Idempotency-Key": key}, json=run_body
            )
            assert run.status_code == 202, run.text
            run_id = run.json()["resource_id"]
            assert (
                client.get(f"/api/v1/predictions/{prediction_id}").json()["pairing_status"]
                == "pending"
            )
            assert client.get(pair_url).status_code == 409
            pending_history = client.get(history_url).json()
            assert pending_history["items"] == []
            assert pending_history["scanned_count"] == 1
            assert (
                client.post(
                    "/api/v1/experiments/runs", headers={"Idempotency-Key": key}, json=run_body
                ).json()["resource_id"]
                == run_id
            )
            again = client.post(
                "/api/v1/experiments/runs", headers={"Idempotency-Key": str(uuid4())}, json=run_body
            )
            assert again.status_code == 409
            assert again.json()["error"]["code"] == "prediction_already_paired"
            assert dispatch_once().published == 1
            receipt = AsyncResult(run_id, app=celery_app)
            try:
                assert receipt.get(timeout=60) == "succeeded"
            finally:
                receipt.forget()
            pair = client.get(pair_url)
            assert pair.status_code == 200, pair.text
            assert pair.json()["run_id"] == run_id
            assert pair.json()["basis_labels"] == ["1", "0"]
            assert pair.json()["simulated_vector"] == pytest.approx([0.5, 0.5])
            assert pair.json()["prediction_match"] == pytest.approx(0.75)
            assert pair.json()["metric_version"] == "tvd-v1"
            assert (
                client.get(f"/api/v1/predictions/{prediction_id}").json()["pairing_status"]
                == "paired"
            )
            assert (
                client.post(
                    f"/api/v1/learning-sessions/{session_id}/predictions",
                    headers={"Idempotency-Key": prediction_key},
                    json=prediction_body,
                ).json()["pairing_status"]
                == "paired"
            )
            sampled = client.post(
                f"/api/v1/learning-sessions/{session_id}/predictions",
                headers={"Idempotency-Key": str(uuid4())},
                json={
                    "schema_version": 1,
                    "lesson_id": "u1-quantum-foundations",
                    "lesson_version": 1,
                    "learning_session_id": session_id,
                    "prediction_vector": [0.25, 0.75],
                    "basis_labels": ["1", "0"],
                    "measurement_qubits": [0],
                    "comparison_basis": "sampled_frequency",
                },
            )
            assert sampled.status_code == 201
            sampled_prediction_id = sampled.json()["id"]
            sampled_run = client.post(
                "/api/v1/experiments/runs",
                headers={"Idempotency-Key": str(uuid4())},
                json={**run_body, "shots": 1, "prediction_id": sampled_prediction_id},
            )
            assert sampled_run.status_code == 202, sampled_run.text
            sampled_run_id = sampled_run.json()["resource_id"]
            assert dispatch_once().published == 1
            sampled_receipt = AsyncResult(sampled_run_id, app=celery_app)
            try:
                assert sampled_receipt.get(timeout=60) == "succeeded"
            finally:
                sampled_receipt.forget()
            sampled_pair = client.get(f"/api/v1/predictions/{sampled_prediction_id}/pair")
            assert sampled_pair.status_code == 200, sampled_pair.text
            assert sampled_pair.json()["simulated_vector"] in ([1.0, 0.0], [0.0, 1.0])
            assert sampled_pair.json()["comparison_basis"] == "sampled_frequency"
            assert sampled_pair.json()["shots"] == 1
            history = client.get(history_url)
            assert history.status_code == 200, history.text
            assert {item["prediction_id"] for item in history.json()["items"]} == {
                prediction_id,
                sampled_prediction_id,
            }
            assert {item["comparison_basis"] for item in history.json()["items"]} == {
                "ideal_probability",
                "sampled_frequency",
            }
            for item in history.json()["items"]:
                assert len(item["largest_deltas"]) == 2
                assert item["metric_version"] == "tvd-v1"
                assert any(
                    item["prediction_match"] == pytest.approx(expected) for expected in (0.25, 0.75)
                )
            with Session(get_engine()) as db:
                tutor_context = load_tutor_context(
                    db, actor, UUID(session_id), stage="observe", run_id=UUID(run_id)
                )
            assert tutor_context.lesson_id == "u1-quantum-foundations"
            assert tutor_context.run_status == "succeeded"
            assert tutor_context.circuit is not None
            assert tutor_context.circuit["qubits"] == 1
            assert len(tutor_context.history.items) == 2
            assert str(run_id) in tutor_context.source_record_ids
            assert "exact_probabilities" in tutor_context.backend_capabilities
            assert tutor_context.result_preview is not None
            assert tutor_context.result_preview["top_exact_probabilities"]
            second_session = client.post(
                "/api/v1/learning-sessions",
                headers={"Idempotency-Key": str(uuid4())},
                json={"lesson_id": "u1-quantum-foundations", "lesson_version": 1},
            )
            assert second_session.status_code == 201
            second_session_id = second_session.json()["id"]
            with Session(get_engine()) as db, pytest.raises(ApiHTTPException) as mismatch:
                load_tutor_context(
                    db, actor, UUID(second_session_id), stage="observe", run_id=UUID(run_id)
                )
            assert mismatch.value.status_code == 409
            current = IdentityClaims(second_subject, "pair-second@example.test")
            assert client.get("/api/v1/me").status_code == 200
            assert client.get(history_url).status_code == 404
            assert client.get(pair_url).status_code == 404
            assert client.get(f"/api/v1/predictions/{prediction_id}").status_code == 404
            other_circuit = client.post(
                "/api/v1/circuits",
                headers={"Idempotency-Key": str(uuid4())},
                json={"name": "Other", "qubits": 1, "gates": []},
            )
            assert other_circuit.status_code == 201
            second_circuit_id = other_circuit.json()["id"]
            assert (
                client.post(
                    "/api/v1/experiments/runs",
                    headers={"Idempotency-Key": str(uuid4())},
                    json={**run_body, "circuit_id": second_circuit_id},
                ).status_code
                == 404
            )
    finally:
        app.dependency_overrides.clear()
        with Session(get_engine()) as db, db.begin():
            if prediction_id is not None:
                db.execute(delete(Prediction).where(Prediction.id == UUID(prediction_id)))
            if sampled_prediction_id is not None:
                db.execute(delete(Prediction).where(Prediction.id == UUID(sampled_prediction_id)))
            if run_id is not None:
                db.execute(delete(ExperimentRun).where(ExperimentRun.id == UUID(run_id)))
                db.execute(delete(JobOutbox).where(JobOutbox.job_id == UUID(run_id)))
                db.execute(delete(Job).where(Job.id == UUID(run_id)))
            if sampled_run_id is not None:
                db.execute(delete(ExperimentRun).where(ExperimentRun.id == UUID(sampled_run_id)))
                db.execute(delete(JobOutbox).where(JobOutbox.job_id == UUID(sampled_run_id)))
                db.execute(delete(Job).where(Job.id == UUID(sampled_run_id)))
            if session_id is not None:
                db.execute(delete(LearningSession).where(LearningSession.id == UUID(session_id)))
            if second_session_id is not None:
                db.execute(
                    delete(LearningSession).where(LearningSession.id == UUID(second_session_id))
                )
            if circuit_id is not None:
                db.execute(delete(Circuit).where(Circuit.id == UUID(circuit_id)))
            if second_circuit_id is not None:
                db.execute(delete(Circuit).where(Circuit.id == UUID(second_circuit_id)))
            db.execute(
                delete(Profile).where(Profile.auth_subject.in_([first_subject, second_subject]))
            )
