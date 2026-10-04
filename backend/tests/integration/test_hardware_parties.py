from concurrent.futures import ThreadPoolExecutor
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.modules.identity.models import Profile
from app.modules.identity.public import Actor
from app.modules.identity.service import get_or_create_profile
from app.modules.parties import service
from app.modules.parties.models import Party
from app.modules.parties.schemas import InviteCreate, PartyCreate, RoomAction

pytestmark = pytest.mark.integration


def test_hardware_party_concurrent_edits_integrity_replay_permissions_and_cascades():
    subjects = [uuid4() for _ in range(3)]
    actors = []
    party_id = None
    stage = {
        "id": "300K",
        "label": "Room temperature",
        "temperatureK": 300,
        "temperatureLabel": "300 K",
        "color": "#123456",
        "plateDiameterMm": 620,
        "plateThicknessMm": 16,
        "material": "Copper",
        "description": "Test stage",
    }
    design = {
        "meta": {"name": "Shared hardware", "qubits": 1, "createdAt": 0, "updatedAt": 0},
        "stages": [stage],
        "placed": [],
        "routes": [],
    }
    try:
        for subject in subjects:
            with Session(get_engine(), expire_on_commit=False) as db:
                profile = get_or_create_profile(db, subject, f"{subject}@example.test")
                actors.append(Actor(profile.id, profile.email, profile.role))
        with Session(get_engine(), expire_on_commit=False) as db:
            body = PartyCreate(kind="hardware", design=design, capacity=3)
            key = uuid4()
            room = service.create(db, actors[0], body, key)
            party_id = UUID(room["id"])
            assert room["kind"] == "hardware"
            assert service.create(db, actors[0], body, key) == room
            invite = service.invite(db, actors[0], party_id, InviteCreate(role="edit"))
            service.accept(db, actors[1], invite["token"])
            invite = service.invite(db, actors[0], party_id, InviteCreate(role="view"))
            service.accept(db, actors[2], invite["token"])

        def placed(identifier):
            return {
                "id": identifier,
                "componentId": "attenuator",
                "stageId": "300K",
                "position": {"x": 0, "y": 0},
                "rotationDeg": 0,
            }

        def action(changes, revision=2):
            return RoomAction(
                event_id=uuid4(),
                circuit_id=party_id,
                base_revision=revision,
                kind="hardware",
                changes=changes,
            )

        def edit(actor, identifier):
            op = action({"placed": {"upsert": [placed(identifier)]}})
            with Session(get_engine(), expire_on_commit=False) as db:
                return service.act(db, actor, party_id, op), op

        with ThreadPoolExecutor(2) as pool:
            futures = [pool.submit(edit, actors[i], name) for i, name in enumerate(("a", "b"))]
            accepted = [future.result() for future in futures]
        assert {item[0]["revision"] for item in accepted} == {3, 4}
        with Session(get_engine(), expire_on_commit=False) as db:
            state = service.read(db, actors[0], party_id, 0)
            assert {p["id"] for p in state["snapshot"]["placed"]} == {"a", "b"}
            assert [e["revision"] for e in state["events"]] == [1, 2, 3, 4]
            assert service.act(db, actors[0], party_id, accepted[0][1]) == accepted[0][0]
            route = {
                "id": "wire",
                "lineType": "xy",
                "fromPlacedId": "a",
                "fromPort": "out",
                "toPlacedId": "b",
                "toPort": "in",
                "waypoints": [],
                "cableFamilyId": "ss-coax",
                "attenuationDb": 0,
            }
            service.act(db, actors[1], party_id, action({"routes": {"upsert": [route]}}))
            for invalid in (
                {"routes": {"upsert": [{**route, "id": "bad", "toPlacedId": "missing"}]}},
                {"routes": {"upsert": [{**route, "id": "bad", "fromPort": "unknown"}]}},
                {"routes": {"upsert": [{**route, "id": "bad"}]}},
                {"placed": {"upsert": [{**placed("bad"), "componentId": "unknown"}]}},
            ):
                with pytest.raises(HTTPException) as failed:
                    service.act(db, actors[0], party_id, action(invalid))
                assert failed.value.status_code == 422
                assert service.read(db, actors[0], party_id)["revision"] == 5
            with pytest.raises(HTTPException) as denied:
                service.act(db, actors[2], party_id, action({"placed": {"delete": ["a"]}}))
            assert denied.value.status_code == 403
            with pytest.raises(HTTPException) as stale:
                service.act(
                    db, actors[0], party_id, action({"meta": {**design["meta"], "name": "Stale"}})
                )
            assert stale.value.status_code == 409
            with pytest.raises(HTTPException) as wrong:
                service.act(
                    db,
                    actors[0],
                    party_id,
                    RoomAction(
                        event_id=uuid4(),
                        circuit_id=party_id,
                        base_revision=5,
                        kind="upsert",
                        gate={"id": "h", "type": "H", "qubit": 0, "step": 0},
                    ),
                )
            assert wrong.value.status_code == 422
            with pytest.raises(HTTPException) as frozen:
                service.freeze(db, actors[0], party_id, 5, uuid4())
            assert frozen.value.status_code == 422
            # Stale deletion cascades over wiring added after the client's base revision.
            service.act(db, actors[0], party_id, action({"placed": {"delete": ["a"]}}))
            state = service.read(db, actors[1], party_id, 4)
            assert state["snapshot"]["routes"] == []
            assert [e["revision"] for e in state["events"]] == [5, 6]
            moved = {**placed("b"), "position": {"x": 0.8, "y": 24}}
            service.act(db, actors[1], party_id, action({"placed": {"upsert": [moved]}}))
            assert service.read(db, actors[0], party_id)["snapshot"]["placed"] == [moved]
            service.remove(db, actors[0], party_id, actors[1].id)
            with pytest.raises(HTTPException) as revoked:
                service.read(db, actors[1], party_id)
            assert revoked.value.status_code == 404
    finally:
        with Session(get_engine()) as db, db.begin():
            if party_id:
                db.execute(delete(Party).where(Party.id == party_id))
            db.execute(delete(Profile).where(Profile.auth_subject.in_(subjects)))
