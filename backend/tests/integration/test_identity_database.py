from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.main import create_app
from app.modules.identity.models import Profile
from app.modules.identity.public import IdentityClaims, get_claims

pytestmark = pytest.mark.integration


def test_profiles_are_durable_isolated_and_roles_cannot_be_client_assigned():
    app = create_app()
    first_subject, second_subject = uuid4(), uuid4()
    current = IdentityClaims(first_subject, "first@example.test")
    app.dependency_overrides[get_claims] = lambda: current
    try:
        with TestClient(app) as client:
            first = client.get("/api/v1/me")
            assert first.status_code == 200, first.text
            first_id = first.json()["id"]
            assert first.json()["role"] == "learner"
            assert first.json()["timezone"] == "UTC"
            assert first.json()["revision"] == 1
            initial_etag = first.headers["ETag"]

            missing_precondition = client.patch("/api/v1/me", json={"name": "Lost update"})
            assert missing_precondition.status_code == 428
            assert missing_precondition.json()["error"]["code"] == "precondition_required"
            malformed_precondition = client.patch(
                "/api/v1/me", headers={"If-Match": "rev-1"}, json={"name": "Lost update"}
            )
            assert malformed_precondition.status_code == 400
            assert malformed_precondition.json()["error"]["code"] == "invalid_precondition"

            patched = client.patch(
                "/api/v1/me",
                headers={"If-Match": initial_etag},
                json={
                    "name": "First Learner",
                    "preferences": {"reduceMotion": True},
                    "timezone": "Asia/Kolkata",
                },
            )
            assert patched.status_code == 200, patched.text
            assert patched.json()["name"] == "First Learner"
            assert patched.json()["preferences"]["reduceMotion"] is True
            assert patched.json()["timezone"] == "Asia/Kolkata"
            assert patched.json()["revision"] == 2
            assert patched.headers["ETag"] == '"rev-2"'

            stale = client.patch(
                "/api/v1/me", headers={"If-Match": initial_etag}, json={"name": "Stale edit"}
            )
            assert stale.status_code == 412
            assert stale.json()["error"]["code"] == "revision_conflict"
            assert stale.headers["ETag"] == patched.headers["ETag"]
            assert client.get("/api/v1/me").json()["name"] == "First Learner"

            forbidden = client.patch(
                "/api/v1/me",
                headers={"If-Match": patched.headers["ETag"]},
                json={"role": "instructor"},
            )
            assert forbidden.status_code == 422
            bad_zone = client.patch(
                "/api/v1/me",
                headers={"If-Match": patched.headers["ETag"]},
                json={"timezone": "Mars/Olympus_Mons"},
            )
            assert bad_zone.status_code == 422
            assert client.get("/api/v1/me").json()["role"] == "learner"

            current = IdentityClaims(second_subject, "second@example.test")
            second = client.get("/api/v1/me")
            assert second.status_code == 200, second.text
            assert second.json()["id"] != first_id
            assert second.json()["name"] == "second"
            assert second.json()["preferences"]["reduceMotion"] is False

            current = IdentityClaims(first_subject, "first.new@example.test")
            restored = client.get("/api/v1/me")
            assert restored.status_code == 200
            assert restored.json()["id"] == first_id
            assert restored.json()["name"] == "First Learner"
            assert restored.json()["email"] == "first.new@example.test"
            assert restored.json()["timezone"] == "Asia/Kolkata"
            assert restored.json()["revision"] == 3
            assert restored.headers["ETag"] == '"rev-3"'
    finally:
        app.dependency_overrides.clear()
        with Session(get_engine()) as session, session.begin():
            session.execute(
                delete(Profile).where(Profile.auth_subject.in_([first_subject, second_subject]))
            )


def test_profile_subject_has_database_uniqueness():
    subject = uuid4()
    with Session(get_engine()) as session:
        try:
            with session.begin():
                session.add(
                    Profile(auth_subject=subject, email="a@example.test", name="A", preferences={})
                )
            with pytest.raises(IntegrityError), session.begin():
                session.add(
                    Profile(auth_subject=subject, email="b@example.test", name="B", preferences={})
                )
                session.flush()
        finally:
            session.rollback()
            with session.begin():
                session.execute(delete(Profile).where(Profile.auth_subject == subject))
