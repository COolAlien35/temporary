import sys
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.main import create_app
from app.modules.cohorts.models import Cohort, Invitation
from app.modules.identity.models import Profile
from app.modules.identity.provision_instructor import main as provision_instructor_main
from app.modules.identity.public import IdentityClaims, get_claims
from app.modules.identity.service import provision_instructor

pytestmark = pytest.mark.integration


def test_instructor_provisioning_and_cohort_boundaries(monkeypatch):
    subjects = [uuid4() for _ in range(4)]
    emails = [f"cohort-{subject.hex}@example.test" for subject in subjects]
    current = IdentityClaims(subjects[0], emails[0])
    app = create_app()
    app.dependency_overrides[get_claims] = lambda: current
    cohort_ids = []
    try:
        with TestClient(app) as client:
            ids = []
            for subject, email in zip(subjects, emails, strict=True):
                current = IdentityClaims(subject, email)
                profile = client.get("/api/v1/me")
                assert profile.status_code == 200, profile.text
                ids.append(profile.json()["id"])

            current = IdentityClaims(subjects[0], emails[0])
            assert client.post("/api/v1/cohorts", json={"name": "Alpha"}).status_code == 403

            command = [
                "provision_instructor",
                "--subject",
                str(subjects[0]),
                "--operator",
                "integration-test",
                "--reason",
                "cohort access test",
            ]
            monkeypatch.setattr(sys, "argv", command)
            with pytest.raises(SystemExit):
                provision_instructor_main()
            assert client.get("/api/v1/me").json()["role"] == "learner"
            monkeypatch.setattr(sys, "argv", [*command, "--apply"])
            assert provision_instructor_main() == 0

            with Session(get_engine()) as session:
                assert provision_instructor(session, subjects[0]) is False
                assert provision_instructor(session, subjects[1]) is True
                with pytest.raises(LookupError):
                    provision_instructor(session, uuid4())

            cohort = client.post("/api/v1/cohorts", json={"name": "  Alpha  "})
            assert cohort.status_code == 201, cohort.text
            cohort_id = cohort.json()["id"]
            cohort_ids.append(cohort_id)
            assert cohort.json()["name"] == "Alpha"
            assert cohort.json()["role"] == "instructor"

            assert (
                client.put(f"/api/v1/cohorts/{cohort_id}/instructors/{ids[2]}").status_code == 422
            )
            assigned = client.put(f"/api/v1/cohorts/{cohort_id}/instructors/{ids[1]}")
            assert assigned.status_code == 204, assigned.text

            second_cohort = client.post("/api/v1/cohorts", json={"name": "Beta"})
            assert second_cohort.status_code == 201
            second_cohort_id = second_cohort.json()["id"]
            cohort_ids.append(second_cohort_id)

            invite = client.post(
                f"/api/v1/cohorts/{cohort_id}/invitations", json={"email": emails[2].upper()}
            )
            assert invite.status_code == 201, invite.text
            token = invite.json()["token"]
            assert len(token) == 64
            with Session(get_engine()) as session:
                saved = session.scalar(
                    select(Invitation).where(Invitation.id == invite.json()["id"])
                )
                assert saved is not None
                assert saved.token_hash != token
                assert saved.email == emails[2]

            current = IdentityClaims(subjects[3], emails[3])
            assert client.get(f"/api/v1/cohorts/{cohort_id}").status_code == 404
            assert client.get(f"/api/v1/cohorts/{cohort_id}/members").status_code == 404
            assert (
                client.post("/api/v1/cohort-invitations/accept", json={"token": token}).status_code
                == 403
            )

            current = IdentityClaims(subjects[2], emails[2])
            accepted = client.post("/api/v1/cohort-invitations/accept", json={"token": token})
            assert accepted.status_code == 200, accepted.text
            assert accepted.json()["role"] == "learner"
            assert (
                client.post("/api/v1/cohort-invitations/accept", json={"token": token}).status_code
                == 200
            )
            assert client.get(f"/api/v1/cohorts/{cohort_id}").status_code == 200
            assert client.get(f"/api/v1/cohorts/{cohort_id}/members").status_code == 403
            assert (
                client.post(
                    f"/api/v1/cohorts/{cohort_id}/invitations", json={"email": emails[3]}
                ).status_code
                == 403
            )

            current = IdentityClaims(subjects[0], emails[0])
            another_invite = client.post(
                f"/api/v1/cohorts/{cohort_id}/invitations", json={"email": emails[2]}
            )
            assert another_invite.status_code == 201
            current = IdentityClaims(subjects[2], emails[2])
            assert (
                client.post(
                    "/api/v1/cohort-invitations/accept",
                    json={"token": another_invite.json()["token"]},
                ).status_code
                == 200
            )

            current = IdentityClaims(subjects[1], emails[1])
            assert client.get(f"/api/v1/cohorts/{second_cohort_id}/members").status_code == 404
            assert (
                client.put(f"/api/v1/cohorts/{cohort_id}/instructors/{ids[0]}").status_code == 403
            )
            members = client.get(f"/api/v1/cohorts/{cohort_id}/members")
            assert members.status_code == 200
            assert {row["profile_id"] for row in members.json()} == set(ids[:3])
            assert client.delete(f"/api/v1/cohorts/{cohort_id}/members/{ids[0]}").status_code == 409
            assert client.delete(f"/api/v1/cohorts/{cohort_id}/members/{ids[2]}").status_code == 204

            current = IdentityClaims(subjects[2], emails[2])
            assert client.get(f"/api/v1/cohorts/{cohort_id}").status_code == 404
            assert (
                client.post("/api/v1/cohort-invitations/accept", json={"token": token}).status_code
                == 409
            )
    finally:
        app.dependency_overrides.clear()
        with Session(get_engine()) as session, session.begin():
            session.execute(delete(Cohort).where(Cohort.id.in_(cohort_ids)))
            session.execute(delete(Profile).where(Profile.auth_subject.in_(subjects)))


def test_revoked_and_expired_invitations_cannot_be_used():
    owner_subject, learner_subject = uuid4(), uuid4()
    owner_email, learner_email = "owner-test@example.test", "learner-test@example.test"
    current = IdentityClaims(owner_subject, owner_email)
    app = create_app()
    app.dependency_overrides[get_claims] = lambda: current
    cohort_id = None
    try:
        with TestClient(app) as client:
            assert client.get("/api/v1/me").status_code == 200
            with Session(get_engine()) as session:
                provision_instructor(session, owner_subject)
            cohort = client.post("/api/v1/cohorts", json={"name": "Expiry cohort"})
            assert cohort.status_code == 201, cohort.text
            cohort_id = cohort.json()["id"]

            revoked = client.post(
                f"/api/v1/cohorts/{cohort_id}/invitations", json={"email": learner_email}
            ).json()
            assert (
                client.delete(
                    f"/api/v1/cohorts/{cohort_id}/invitations/{revoked['id']}"
                ).status_code
                == 204
            )
            expired = client.post(
                f"/api/v1/cohorts/{cohort_id}/invitations", json={"email": learner_email}
            ).json()
            with Session(get_engine()) as session, session.begin():
                invite = session.get_one(Invitation, expired["id"])
                invite.expires_at = datetime.now(UTC) - timedelta(seconds=1)

            current = IdentityClaims(learner_subject, learner_email)
            assert (
                client.post(
                    "/api/v1/cohort-invitations/accept", json={"token": revoked["token"]}
                ).status_code
                == 404
            )
            assert (
                client.post(
                    "/api/v1/cohort-invitations/accept", json={"token": expired["token"]}
                ).status_code
                == 410
            )
            assert client.get("/api/v1/cohorts").json() == []
    finally:
        app.dependency_overrides.clear()
        with Session(get_engine()) as session, session.begin():
            if cohort_id is not None:
                session.execute(delete(Cohort).where(Cohort.id == cohort_id))
            session.execute(
                delete(Profile).where(Profile.auth_subject.in_([owner_subject, learner_subject]))
            )
