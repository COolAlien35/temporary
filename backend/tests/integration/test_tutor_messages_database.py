from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.session import get_engine
from app.integrations.ai.chat import TutorProviderError
from app.main import create_app
from app.modules.ai_tutor.models import TutorMessage
from app.modules.ai_tutor.router import get_tutor_provider
from app.modules.identity.models import Profile
from app.modules.identity.public import IdentityClaims, get_claims
from app.modules.predictions.models import LearningSession

pytestmark = pytest.mark.integration


class FakeTutorProvider:
    def __init__(self) -> None:
        self.calls = 0
        self.fail = False

    def complete(self, messages, *, model, max_completion_tokens, timeout_seconds):
        self.calls += 1
        if self.fail:
            raise TutorProviderError("secret provider detail")
        return "Check what the measurement samples before changing the circuit."


def test_tutor_messages_are_durable_scoped_idempotent_and_quota_bound() -> None:
    first_subject, second_subject = uuid4(), uuid4()
    claims = IdentityClaims(first_subject, "tutor-first@example.test")
    provider = FakeTutorProvider()
    app = create_app(Settings(tutor_daily_request_limit=2))
    app.dependency_overrides[get_claims] = lambda: claims
    app.dependency_overrides[get_tutor_provider] = lambda: provider
    learning_session_id = second_session_id = message_id = failed_id = None
    try:
        with TestClient(app) as client:
            assert client.get("/api/v1/me").status_code == 200
            created_session = client.post(
                "/api/v1/learning-sessions",
                headers={"Idempotency-Key": str(uuid4())},
                json={"lesson_id": "u1-quantum-foundations", "lesson_version": 1},
            )
            assert created_session.status_code == 201
            learning_session_id = created_session.json()["id"]
            path = f"/api/v1/learning-sessions/{learning_session_id}/tutor/messages"
            body = {"action": "explain", "stage": "learn", "prompt": "What is measured?"}
            invalid = client.post(
                path,
                headers={"Idempotency-Key": str(uuid4())},
                json={**body, "circuit_id": str(uuid4())},
            )
            assert invalid.status_code == 422
            assert provider.calls == 0
            key = str(uuid4())
            response = client.post(path, headers={"Idempotency-Key": key}, json=body)
            assert response.status_code == 201, response.text
            message_id = response.json()["id"]
            assert response.json()["status"] == "completed"
            assert response.json()["role"] == "pedagogical_guide"
            assert response.json()["run_id"] is None
            assert response.json()["provider_called"] is True
            assert learning_session_id in response.json()["source_record_ids"]
            assert provider.calls == 1
            assert client.get(f"/api/v1/tutor/messages/{message_id}").json() == response.json()
            assert (
                client.post(path, headers={"Idempotency-Key": key}, json=body).json()
                == response.json()
            )
            assert provider.calls == 1
            conflict = client.post(
                path, headers={"Idempotency-Key": key}, json={**body, "prompt": "Different"}
            )
            assert conflict.status_code == 409
            assert conflict.json()["error"]["code"] == "idempotency_conflict"
            provider.fail = True
            failed_key = str(uuid4())
            failed = client.post(path, headers={"Idempotency-Key": failed_key}, json=body)
            assert failed.status_code == 503
            assert "secret provider detail" not in failed.text
            assert provider.calls == 2
            listing = client.get(path)
            assert listing.status_code == 200
            assert len(listing.json()) == 2
            failed_record = next(item for item in listing.json() if item["status"] == "failed")
            failed_id = failed_record["id"]
            assert failed_record["error_code"] == "provider_unavailable"
            assert failed_record["response_text"] is None
            assert (
                client.post(path, headers={"Idempotency-Key": failed_key}, json=body).status_code
                == 503
            )
            assert provider.calls == 2
            limited = client.post(path, headers={"Idempotency-Key": str(uuid4())}, json=body)
            assert limited.status_code == 429
            assert limited.json()["error"]["code"] == "tutor_daily_limit"
            claims = IdentityClaims(second_subject, "tutor-second@example.test")
            assert client.get("/api/v1/me").status_code == 200
            assert client.get(f"/api/v1/tutor/messages/{message_id}").status_code == 404
            assert client.get(path).status_code == 404
            assert (
                client.post(path, headers={"Idempotency-Key": str(uuid4())}, json=body).status_code
                == 404
            )
            assert provider.calls == 2
            second_session = client.post(
                "/api/v1/learning-sessions",
                headers={"Idempotency-Key": str(uuid4())},
                json={"lesson_id": "u1-quantum-foundations", "lesson_version": 1},
            )
            assert second_session.status_code == 201
            second_session_id = second_session.json()["id"]
            del app.dependency_overrides[get_tutor_provider]
            unavailable_path = f"/api/v1/learning-sessions/{second_session_id}/tutor/messages"
            unavailable = client.post(
                unavailable_path, headers={"Idempotency-Key": str(uuid4())}, json=body
            )
            assert unavailable.status_code == 503
            assert unavailable.json()["error"]["code"] == "tutor_not_configured"
            assert client.get(unavailable_path).json() == []
    finally:
        app.dependency_overrides.clear()
        with Session(get_engine()) as db, db.begin():
            if message_id is not None:
                db.execute(delete(TutorMessage).where(TutorMessage.id == UUID(message_id)))
            if failed_id is not None:
                db.execute(delete(TutorMessage).where(TutorMessage.id == UUID(failed_id)))
            if learning_session_id is not None:
                db.execute(
                    delete(LearningSession).where(LearningSession.id == UUID(learning_session_id))
                )
            if second_session_id is not None:
                db.execute(
                    delete(LearningSession).where(LearningSession.id == UUID(second_session_id))
                )
            db.execute(
                delete(Profile).where(Profile.auth_subject.in_([first_subject, second_subject]))
            )
