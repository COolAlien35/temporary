from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.main import create_app
from app.modules.circuits.models import Circuit
from app.modules.identity.models import Profile
from app.modules.identity.public import Actor, IdentityClaims, get_claims
from app.modules.parties import public, service
from app.modules.parties.models import Invitation, Party, PartyEvent
from app.modules.parties.schemas import RoomAction

pytestmark = pytest.mark.integration


def test_party_permissions_capacity_invitation_replay_concurrent_edits_and_recovery():
    subjects = [uuid4() for _ in range(4)]
    current = IdentityClaims(subjects[0], "owner@example.test")
    app = create_app()
    app.dependency_overrides[get_claims] = lambda: current
    party_id = None
    actors = []
    try:
        with TestClient(app) as client:
            for index, subject in enumerate(subjects):
                current = IdentityClaims(subject, f"member{index}@example.test")
                profile = client.get("/api/v1/me").json()
                actors.append(Actor(UUID(profile["id"]), current.email, "learner"))
            current = IdentityClaims(subjects[0], actors[0].email)
            body = {"capacity": 3, "circuit": {"name": "Study Bell", "qubits": 2, "gates": []}}
            key = {"Idempotency-Key": str(uuid4())}
            created = client.post("/api/v1/parties", json=body, headers=key)
            assert created.status_code == 201, created.text
            party_id = UUID(created.json()["id"])
            root = f"/api/v1/parties/{party_id}"
            assert client.post("/api/v1/parties", json=body, headers=key).json() == created.json()
            assert (
                client.post(
                    "/api/v1/parties", json={**body, "capacity": 2}, headers=key
                ).status_code
                == 409
            )
            invitation = client.post(
                f"{root}/invitations", json={"role": "edit", "email": actors[1].email}
            ).json()
            current = IdentityClaims(subjects[2], actors[2].email)
            assert (
                client.post(
                    "/api/v1/party-invitations/accept", json={"token": invitation["token"]}
                ).status_code
                == 404
            )
            current = IdentityClaims(subjects[1], actors[1].email)
            assert client.get(root).status_code == 404
            accepted = client.post(
                "/api/v1/party-invitations/accept", json={"token": invitation["token"]}
            )
            assert accepted.status_code == 200, accepted.text
            assert (
                client.post(
                    "/api/v1/party-invitations/accept", json={"token": invitation["token"]}
                ).json()["revision"]
                == 1
            )
            assert client.post(f"{root}/invitations", json={}).status_code == 403
            current = IdentityClaims(subjects[0], actors[0].email)
            comment = client.post(f"{root}/invitations", json={"role": "comment"}).json()
            current = IdentityClaims(subjects[2], actors[2].email)
            assert (
                client.post(
                    "/api/v1/party-invitations/accept", json={"token": comment["token"]}
                ).status_code
                == 200
            )
            current = IdentityClaims(subjects[3], actors[3].email)
            assert (
                client.post(
                    "/api/v1/party-invitations/accept", json={"token": comment["token"]}
                ).status_code
                == 409
            )

            def edit(actor, gate_type, gate_id, qubit):
                action = RoomAction(
                    event_id=uuid4(),
                    circuit_id=party_id,
                    base_revision=2,
                    kind="upsert",
                    gate={"id": gate_id, "type": gate_type, "qubit": qubit, "step": 0},
                )
                with Session(get_engine(), expire_on_commit=False) as db:
                    return service.act(db, actor, party_id, action), action

            with ThreadPoolExecutor(2) as executor:
                first = executor.submit(edit, actors[0], "H", "h", 0)
                second = executor.submit(edit, actors[1], "X", "x", 1)
                results = [first.result(), second.result()]
            assert {e[0]["revision"] for e in results} == {3, 4}
            current = IdentityClaims(subjects[0], actors[0].email)
            state = client.get(root, params={"after": 0}).json()
            assert {g["id"] for g in state["snapshot"]["gates"]} == {"h", "x"}
            assert [e["revision"] for e in state["events"]] == [1, 2, 3, 4]
            assert state["replay_complete"] is True
            copy_key = {"Idempotency-Key": str(uuid4())}
            copied = client.post(f"{root}/circuit-copy", json={"revision": 4}, headers=copy_key)
            assert copied.status_code == 201, copied.text
            assert copied.json()["party_revision"] == 4
            assert copied.json()["circuit"]["snapshot"] == state["snapshot"]
            assert (
                client.post(
                    f"{root}/circuit-copy", json={"revision": 3}, headers=copy_key
                ).status_code
                == 409
            )
            assert (
                client.post(
                    f"{root}/circuit-copy",
                    json={"revision": 3},
                    headers={"Idempotency-Key": str(uuid4())},
                ).status_code
                == 409
            )
            assert (
                client.post(f"{root}/circuit-copy", json={"revision": 4}, headers=copy_key).json()
                == copied.json()
            )
            saved_id = copied.json()["circuit"]["id"]
            edited_copy = client.put(
                f"/api/v1/circuits/{saved_id}",
                headers={"If-Match": '"rev-1"'},
                json={"name": "Edited private copy", "qubits": 2, "gates": []},
            )
            assert edited_copy.status_code == 200
            frozen_replay = client.post(
                f"{root}/circuit-copy", json={"revision": 4}, headers=copy_key
            ).json()
            assert frozen_replay["circuit"]["revision"] == 1
            assert frozen_replay["circuit"]["snapshot"] == state["snapshot"]
            event, action = results[0]
            assert (
                client.post(f"{root}/actions", json=action.model_dump(mode="json")).json() == event
            )
            assert (
                client.post(
                    f"{root}/actions", json={**action.model_dump(mode="json"), "base_revision": 1}
                ).status_code
                == 409
            )
            stale_settings = {
                "event_id": str(uuid4()),
                "circuit_id": str(party_id),
                "base_revision": 0,
                "kind": "settings",
                "qubits": 1,
            }
            assert client.post(f"{root}/actions", json=stale_settings).status_code == 409
            current = IdentityClaims(subjects[2], actors[2].email)
            assert (
                client.post(
                    f"{root}/actions", json={**stale_settings, "base_revision": 4}
                ).status_code
                == 403
            )
            chat = {
                "event_id": str(uuid4()),
                "circuit_id": str(party_id),
                "base_revision": 4,
                "kind": "chat",
                "text": "<script>plain text</script>",
            }
            assert client.post(f"{root}/actions", json=chat).status_code == 200
            assert client.get(root).json()["chat"][0]["payload"]["text"] == chat["text"]
            current = IdentityClaims(subjects[0], actors[0].email)
            assert client.delete(f"{root}/members/{actors[1].id}").status_code == 204
            current = IdentityClaims(subjects[1], actors[1].email)
            assert client.get(root).status_code == 404
            assert (
                client.post(f"{root}/actions", json=action.model_dump(mode="json")).status_code
                == 404
            )
            assert (
                client.post(
                    "/api/v1/party-invitations/accept", json={"token": invitation["token"]}
                ).status_code
                == 403
            )
            current = IdentityClaims(subjects[0], actors[0].email)
            assert client.delete(f"{root}/invitations/{invitation['id']}").status_code == 204
            expired = client.post(f"{root}/invitations", json={}).json()
            with Session(get_engine()) as db, db.begin():
                db.get(Invitation, UUID(expired["id"])).expires_at = datetime.now(UTC) - timedelta(
                    seconds=1
                )
            current = IdentityClaims(subjects[3], actors[3].email)
            assert (
                client.post(
                    "/api/v1/party-invitations/accept", json={"token": expired["token"]}
                ).status_code
                == 404
            )

            # Publisher failure rolls back delivery flags; later dispatch replays durable hints.
            def unavailable(*_):
                raise RuntimeError("Redis outage")

            # Hold row locks in an outer transaction while service transactions use
            # savepoints. Other real API dispatchers cannot consume these test rows
            # between resetting them and exercising the failed/successful publishers.
            with (
                get_engine().connect() as connection,
                connection.begin(),
                Session(connection, join_transaction_mode="create_savepoint") as db,
            ):
                with db.begin():
                    for e in db.scalars(select(PartyEvent).where(PartyEvent.party_id == party_id)):
                        e.delivered_at = None
                with pytest.raises(RuntimeError):
                    public.deliver_pending(db, unavailable)
                hints = []
                assert public.deliver_pending(db, lambda *args: hints.append(args)) >= 1
                assert hints
            current = IdentityClaims(subjects[0], actors[0].email)
            assert client.delete(root).status_code == 204
            assert client.get(root).status_code == 404
    finally:
        with Session(get_engine()) as db, db.begin():
            if party_id:
                db.execute(delete(Party).where(Party.id == party_id))
            db.execute(delete(Circuit).where(Circuit.owner_id.in_([a.id for a in actors])))
            db.execute(delete(Profile).where(Profile.auth_subject.in_(subjects)))


def test_six_seat_room_serializes_concurrent_invites_and_falls_back_to_snapshot():
    from app.modules.identity.service import get_or_create_profile
    from app.modules.parties.schemas import InviteCreate, PartyCreate

    subjects = [uuid4() for _ in range(8)]
    actors = []
    party_id = None
    try:
        for index, subject in enumerate(subjects):
            with Session(get_engine(), expire_on_commit=False) as db:
                profile = get_or_create_profile(db, subject, f"capacity{index}@example.test")
                actors.append(Actor(profile.id, profile.email, profile.role))
        with Session(get_engine(), expire_on_commit=False) as db:
            room = service.create(
                db,
                actors[0],
                PartyCreate(capacity=6, circuit={"name": "Six seats", "qubits": 1, "gates": []}),
                uuid4(),
            )
            party_id = UUID(room["id"])
            invitation = service.invite(db, actors[0], party_id, InviteCreate(role="view"))

        def redeem(actor):
            with Session(get_engine(), expire_on_commit=False) as db:
                try:
                    return service.accept(db, actor, invitation["token"])
                except HTTPException as exc:
                    assert exc.status_code == 409
                    return None

        with ThreadPoolExecutor(7) as pool:
            accepted = list(pool.map(redeem, actors[1:]))
        assert sum(value is not None for value in accepted) == 5
        with Session(get_engine(), expire_on_commit=False) as db:
            state = service.read(db, actors[0], party_id)
            assert len(state["members"]) == 6
            viewer = next(
                actor
                for actor in actors[1:]
                if any(m["id"] == str(actor.id) for m in state["members"])
            )
            with pytest.raises(HTTPException) as denied:
                service.act(
                    db,
                    viewer,
                    party_id,
                    RoomAction(
                        event_id=uuid4(),
                        circuit_id=party_id,
                        base_revision=5,
                        kind="chat",
                        text="Forbidden",
                    ),
                )
            assert denied.value.status_code == 403
            with db.begin():
                party = db.get(Party, party_id)
                for _ in range(105):
                    service.record(db, party, actors[0], "chat", {"text": "Durable history"})
            replay = service.read(db, actors[0], party_id, 0)
            assert replay["replay_complete"] is False
            assert replay["events"] == []
            assert replay["revision"] == 110
            assert len(replay["chat"]) == 50
            assert replay["snapshot"]["name"] == "Six seats"
    finally:
        with Session(get_engine()) as db, db.begin():
            if party_id:
                db.execute(delete(Party).where(Party.id == party_id))
            db.execute(delete(Profile).where(Profile.auth_subject.in_(subjects)))
