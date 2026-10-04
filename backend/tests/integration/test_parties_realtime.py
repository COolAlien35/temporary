"""Real websocket clients, two independent API pools and Redis pub/sub."""

import json
import socket
import threading
import time
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import httpx
import jwt
import pytest
import socketio
import uvicorn
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_engine
from app.main import create_app
from app.modules.identity.models import Profile
from app.modules.identity.public import jwks_client
from app.modules.parties.models import Party

pytestmark = pytest.mark.integration


def wait_for(predicate, timeout=8):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.05)
    assert predicate(), "Timed out waiting for realtime convergence"


def test_two_api_instances_replay_conflicting_edits_expired_auth_and_revocation(monkeypatch):
    signer = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(RSAAlgorithm.to_jwk(signer.public_key()))
    jwk.update(kid="party-key", alg="RS256", use="sig")
    jwks_client.cache_clear()
    monkeypatch.setattr("jwt.jwks_client.PyJWKClient.fetch_data", lambda self: {"keys": [jwk]})
    issuer = "https://party.example.test/auth/v1"
    settings = get_settings().model_copy(update={"auth_issuer": issuer})
    subjects = [uuid4(), uuid4()]

    def token(index, seconds=3600):
        now = datetime.now(UTC)
        return jwt.encode(
            {
                "sub": str(subjects[index]),
                "email": f"socket{index}@example.test",
                "iss": issuer,
                "aud": "authenticated",
                "role": "authenticated",
                "iat": now,
                "exp": now + timedelta(seconds=seconds),
            },
            signer,
            algorithm="RS256",
            headers={"kid": "party-key"},
        )

    servers, threads, listeners, urls = [], [], [], []
    clients = [
        socketio.Client(websocket_extra_options={"origin": "http://localhost:3000"}),
        socketio.Client(websocket_extra_options={"origin": "http://localhost:3000"}),
    ]
    hints = [[], []]
    party_id = None
    try:
        for _ in range(2):
            listener = socket.socket()
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
            listener.listen(128)
            server = uvicorn.Server(
                uvicorn.Config(create_app(settings), log_level="error", lifespan="on")
            )
            thread = threading.Thread(
                target=server.run, kwargs={"sockets": [listener]}, daemon=True
            )
            thread.start()
            servers.append(server)
            threads.append(thread)
            listeners.append(listener)
            urls.append(f"http://127.0.0.1:{port}")
        wait_for(lambda: all(server.started for server in servers))
        headers = [{"Authorization": f"Bearer {token(i)}"} for i in range(2)]
        for i in range(2):
            assert httpx.get(f"{urls[i]}/api/v1/me", headers=headers[i]).status_code == 200
        created = httpx.post(
            f"{urls[0]}/api/v1/parties",
            headers={**headers[0], "Idempotency-Key": str(uuid4())},
            json={"circuit": {"name": "Distributed", "qubits": 2, "gates": []}, "capacity": 2},
        )
        assert created.status_code == 201, created.text
        party_id = created.json()["id"]
        root = f"/api/v1/parties/{party_id}"
        invitation = httpx.post(f"{urls[0]}{root}/invitations", headers=headers[0], json={}).json()
        accepted = httpx.post(
            f"{urls[1]}/api/v1/party-invitations/accept",
            headers=headers[1],
            json={"token": invitation["token"]},
        )
        assert accepted.status_code == 200
        member_id = next(m["id"] for m in accepted.json()["members"] if m["role"] != "owner")
        for i, client in enumerate(clients):
            client.on("party_changed", lambda data, target=i: hints[target].append(data))
            client.connect(urls[i], auth={"token": token(i)}, transports=["websocket"])
            assert client.call("join", {"party_id": party_id, "after": 0})["ok"] is True

        def action(gate_type, event_id=None):
            return {
                "circuit_id": party_id,
                "event_id": event_id or str(uuid4()),
                "base_revision": 1,
                "kind": "upsert",
                "gate": {"id": "same", "type": gate_type, "step": 0, "qubit": 0},
            }

        first = action("H")
        assert clients[0].call("action", first)["event"]["revision"] == 2
        assert clients[1].call("action", action("X"))["event"]["revision"] == 3
        assert clients[0].call("action", first)["event"]["revision"] == 2
        wait_for(
            lambda: (
                any(h["revision"] == 3 for h in hints[0])
                and any(h["revision"] == 3 for h in hints[1])
            )
        )
        state = httpx.get(f"{urls[0]}{root}", headers=headers[0]).json()
        assert state["snapshot"]["gates"][0]["type"] == "X"
        clients[1].disconnect()
        assert clients[0].call(
            "action",
            {
                "circuit_id": party_id,
                "event_id": str(uuid4()),
                "base_revision": 3,
                "kind": "delete",
                "gate_id": "same",
            },
        )["ok"]
        clients[1].connect(urls[1], auth={"token": token(1)}, transports=["websocket"])
        replay = clients[1].call("join", {"party_id": party_id, "after": 2})["party"]
        assert [e["revision"] for e in replay["events"]] == [3, 4]
        assert replay["snapshot"]["gates"] == []
        assert (
            httpx.delete(f"{urls[0]}{root}/members/{member_id}", headers=headers[0]).status_code
            == 204
        )
        assert clients[1].call("action", action("Z"))["error"]["status"] == 404
        assert httpx.get(f"{urls[1]}{root}", headers=headers[1]).status_code == 404
        wait_for(lambda: not clients[1].connected and clients[1].eio.state == "disconnected")
        with pytest.raises(socketio.exceptions.ConnectionError):
            clients[1].connect(urls[1], auth={"token": token(1, -1)}, transports=["websocket"])
        clients[0].disconnect()
        clients[0].connect(urls[0], auth={"token": token(0, 2)}, transports=["websocket"])
        assert clients[0].call("join", {"party_id": party_id})["ok"]
        wait_for(lambda: not clients[0].connected, timeout=6)
        assert httpx.get(f"{urls[0]}/socket.io/?EIO=4&transport=polling").status_code == 400
    finally:
        for client in clients:
            if client.connected:
                client.disconnect()
        for server in servers:
            server.should_exit = True
        for thread in threads:
            thread.join(timeout=10)
            assert not thread.is_alive()
        for listener in listeners:
            listener.close()
        with Session(get_engine()) as db, db.begin():
            if party_id:
                db.execute(delete(Party).where(Party.id == UUID(party_id)))
            db.execute(delete(Profile).where(Profile.auth_subject.in_(subjects)))
        jwks_client.cache_clear()
