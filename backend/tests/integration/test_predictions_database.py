from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.main import create_app
from app.modules.identity.models import Profile
from app.modules.identity.public import IdentityClaims, get_claims
from app.modules.predictions.models import LearningSession, Prediction

pytestmark = pytest.mark.integration


def test_prediction_is_locked_durable_owner_scoped_and_idempotent():
    first_subject, second_subject = uuid4(), uuid4()
    current = IdentityClaims(first_subject, "predict-first@example.test")
    app = create_app()
    app.dependency_overrides[get_claims] = lambda: current
    session_id = None
    try:
        with TestClient(app) as client:
            first = client.get("/api/v1/me")
            assert first.status_code == 200, first.text
            first_profile_id = first.json()["id"]

            session_key = str(uuid4())
            session_body = {"lesson_id": "u1-quantum-foundations", "lesson_version": 1}
            started = client.post(
                "/api/v1/learning-sessions",
                headers={"Idempotency-Key": session_key},
                json=session_body,
            )
            assert started.status_code == 201, started.text
            session_id = started.json()["id"]
            assert (
                client.post(
                    "/api/v1/learning-sessions",
                    headers={"Idempotency-Key": session_key},
                    json=session_body,
                ).json()["id"]
                == session_id
            )
            changed_session = client.post(
                "/api/v1/learning-sessions",
                headers={"Idempotency-Key": session_key},
                json={"lesson_id": "u1-qubits-and-measurement", "lesson_version": 1},
            )
            assert changed_session.status_code == 409
            assert changed_session.json()["error"]["code"] == "idempotency_conflict"
            assert (
                client.post(
                    "/api/v1/learning-sessions",
                    headers={"Idempotency-Key": str(uuid4())},
                    json={"lesson_id": "missing-lesson", "lesson_version": 1},
                ).status_code
                == 404
            )
            assert (
                client.post(
                    "/api/v1/learning-sessions",
                    headers={"Idempotency-Key": str(uuid4())},
                    json={"lesson_id": "u1-quantum-foundations", "lesson_version": 2},
                ).status_code
                == 409
            )

            prediction_body = {
                "schema_version": 1,
                "lesson_id": session_body["lesson_id"],
                "lesson_version": 1,
                "learning_session_id": session_id,
                "prediction_vector": [0.25, 0.75],
                "basis_labels": ["0", "1"],
                "measurement_qubits": [0],
                "comparison_basis": "sampled_frequency",
                "confidence": 0.8,
            }
            prediction_url = f"/api/v1/learning-sessions/{session_id}/predictions"
            prediction_key = str(uuid4())
            locked = client.post(
                prediction_url,
                headers={"Idempotency-Key": prediction_key},
                json=prediction_body,
            )
            assert locked.status_code == 201, locked.text
            prediction_id = locked.json()["id"]
            assert locked.json()["pairing_status"] == "unpaired"
            assert locked.json()["run_id"] is None
            assert locked.json()["locked_at"]
            assert "simulated_vector" not in locked.json()
            assert "prediction_match" not in locked.json()

            replay = client.post(
                prediction_url,
                headers={"Idempotency-Key": prediction_key},
                json=prediction_body,
            )
            assert replay.status_code == 201, replay.text
            assert replay.json() == locked.json()
            changed = client.post(
                prediction_url,
                headers={"Idempotency-Key": prediction_key},
                json={**prediction_body, "prediction_vector": [0.5, 0.5]},
            )
            assert changed.status_code == 409
            assert changed.json()["error"]["code"] == "idempotency_conflict"
            injected = client.post(
                prediction_url,
                headers={"Idempotency-Key": str(uuid4())},
                json={**prediction_body, "simulated_vector": [0.25, 0.75]},
            )
            assert injected.status_code == 422
            mismatch = client.post(
                prediction_url,
                headers={"Idempotency-Key": str(uuid4())},
                json={**prediction_body, "lesson_id": "u1-qubits-and-measurement"},
            )
            assert mismatch.status_code == 409
            assert mismatch.json()["error"]["code"] == "session_mismatch"

            with Session(get_engine()) as db:
                stored = db.scalar(select(Prediction).where(Prediction.id == UUID(prediction_id)))
                assert stored is not None
                assert str(stored.learner_id) == first_profile_id
                assert stored.prediction_vector == [0.25, 0.75]
                assert stored.locked_at is not None

            current = IdentityClaims(second_subject, "predict-second@example.test")
            second = client.get("/api/v1/me")
            assert second.status_code == 200
            assert client.get(f"/api/v1/learning-sessions/{session_id}").status_code == 404
            assert client.get(f"/api/v1/predictions/{prediction_id}").status_code == 404
            assert (
                client.post(
                    prediction_url,
                    headers={"Idempotency-Key": str(uuid4())},
                    json=prediction_body,
                ).status_code
                == 404
            )
            with Session(get_engine()) as db, pytest.raises(IntegrityError), db.begin():
                db.add(
                    Prediction(
                        learner_id=UUID(second.json()["id"]),
                        learning_session_id=UUID(session_id),
                        lesson_id=session_body["lesson_id"],
                        lesson_version=1,
                        schema_version=1,
                        prediction_vector=[0.25, 0.75],
                        basis_labels=["0", "1"],
                        measurement_qubits=[0],
                        comparison_basis="sampled_frequency",
                        idempotency_key=uuid4(),
                        request_hash="0" * 64,
                    )
                )
                db.flush()

            current = IdentityClaims(first_subject, "predict-first@example.test")
            assert client.get(f"/api/v1/predictions/{prediction_id}").json() == locked.json()
    finally:
        app.dependency_overrides.clear()
        with Session(get_engine()) as db, db.begin():
            if session_id is not None:
                db.execute(
                    delete(Prediction).where(Prediction.learning_session_id == UUID(session_id))
                )
                db.execute(delete(LearningSession).where(LearningSession.id == UUID(session_id)))
            db.execute(
                delete(Profile).where(Profile.auth_subject.in_([first_subject, second_subject]))
            )
