from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.main import create_app
from app.modules.circuits.models import Circuit, CircuitRevision
from app.modules.identity.models import Profile
from app.modules.identity.public import IdentityClaims, get_claims

pytestmark = pytest.mark.integration


def test_circuit_revisions_are_durable_owner_scoped_and_stale_writes_fail():
    first_subject, second_subject = uuid4(), uuid4()
    current = IdentityClaims(first_subject, "circuit-first@example.test")
    app = create_app()
    app.dependency_overrides[get_claims] = lambda: current
    circuit_id = None
    try:
        with TestClient(app) as client:
            assert client.get("/api/v1/me").status_code == 200
            body = {
                "name": "Bell Pair",
                "qubits": 2,
                "gates": [
                    {"id": "h", "type": "H", "step": 0, "qubit": 0},
                    {"id": "cx", "type": "CNOT", "step": 1, "qubit": 0, "target": 1},
                ],
            }
            key = str(uuid4())
            created = client.post("/api/v1/circuits", json=body, headers={"Idempotency-Key": key})
            assert created.status_code == 201, created.text
            circuit_id = created.json()["id"]
            assert created.headers["ETag"] == '"rev-1"'
            assert created.json()["snapshot"]["gates"] == body["gates"]
            assert len(created.json()["checksum_sha256"]) == 64
            replay = client.post("/api/v1/circuits", json=body, headers={"Idempotency-Key": key})
            assert replay.status_code == 201, replay.text
            assert replay.json() == created.json()
            conflict = client.post(
                "/api/v1/circuits",
                json={**body, "name": "Different"},
                headers={"Idempotency-Key": key},
            )
            assert conflict.status_code == 409
            assert conflict.json()["error"]["code"] == "idempotency_conflict"

            assert client.get(f"/api/v1/circuits/{circuit_id}").json() == created.json()
            assert client.put(f"/api/v1/circuits/{circuit_id}", json=body).status_code == 428
            edited = {**body, "name": "Bell experiment"}
            updated = client.put(
                f"/api/v1/circuits/{circuit_id}",
                json=edited,
                headers={"If-Match": created.headers["ETag"]},
            )
            assert updated.status_code == 200, updated.text
            assert updated.headers["ETag"] == '"rev-2"'
            assert updated.json()["snapshot"]["name"] == "Bell experiment"
            stale = client.put(
                f"/api/v1/circuits/{circuit_id}",
                json=body,
                headers={"If-Match": created.headers["ETag"]},
            )
            assert stale.status_code == 412
            assert stale.headers["ETag"] == '"rev-2"'
            unchanged = client.put(
                f"/api/v1/circuits/{circuit_id}",
                json=edited,
                headers={"If-Match": updated.headers["ETag"]},
            )
            assert unchanged.status_code == 200
            assert unchanged.json()["revision"] == 2
            original = client.get(f"/api/v1/circuits/{circuit_id}/revisions/1")
            assert original.status_code == 200
            assert original.json()["snapshot"]["name"] == "Bell Pair"
            assert original.json()["checksum_sha256"] == created.json()["checksum_sha256"]
            assert client.get(f"/api/v1/circuits/{circuit_id}/revisions/3").status_code == 404
            with Session(get_engine()) as db:
                revisions = db.scalars(
                    select(CircuitRevision).where(CircuitRevision.circuit_id == UUID(circuit_id))
                ).all()
                assert {revision.revision for revision in revisions} == {1, 2}

            invalid = client.post(
                "/api/v1/circuits",
                json={
                    **body,
                    "gates": [{"id": "bad", "type": "CNOT", "step": 0, "qubit": 0, "target": 0}],
                },
                headers={"Idempotency-Key": str(uuid4())},
            )
            assert invalid.status_code == 422

            current = IdentityClaims(second_subject, "circuit-second@example.test")
            assert client.get("/api/v1/me").status_code == 200
            assert client.get(f"/api/v1/circuits/{circuit_id}").status_code == 404
            assert client.get(f"/api/v1/circuits/{circuit_id}/revisions/1").status_code == 404
            assert (
                client.put(
                    f"/api/v1/circuits/{circuit_id}",
                    json=edited,
                    headers={"If-Match": updated.headers["ETag"]},
                ).status_code
                == 404
            )
    finally:
        app.dependency_overrides.clear()
        with Session(get_engine()) as db, db.begin():
            if circuit_id is not None:
                db.execute(delete(Circuit).where(Circuit.id == UUID(circuit_id)))
            db.execute(
                delete(Profile).where(Profile.auth_subject.in_([first_subject, second_subject]))
            )
