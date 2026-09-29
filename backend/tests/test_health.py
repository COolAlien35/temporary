from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError as RedisConnectionError
from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.main import create_app
from app.modules.identity.public import get_current_profile


def test_liveness_never_requires_dependencies():
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/health/live", headers={"X-Request-ID": "test-123"})
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["X-Request-ID"] == "test-123"


def test_readiness_checks_dependencies():
    with (
        patch("app.modules.health.router.check_dependencies") as check,
        TestClient(create_app()) as client,
    ):
        response = client.get("/api/v1/health/ready")
    check.assert_called_once()
    assert response.status_code == 200


def test_application_configuration_controls_its_database_pool():
    settings = Settings(database_url="postgresql+psycopg://custom:secret@db/other")
    with (
        patch("app.modules.health.router.check_dependencies") as check,
        TestClient(create_app(settings)) as client,
    ):
        assert client.get("/api/v1/health/ready").status_code == 200
    engine, actual_settings = check.call_args.args
    assert engine.url.database == "other"
    assert engine.url.username == "custom"
    assert actual_settings is settings


@pytest.mark.parametrize(
    "error",
    [
        RedisConnectionError("secret credential"),
        OperationalError("SELECT 1", {}, Exception("secret credential")),
    ],
)
def test_dependency_failure_is_503_without_secrets(error):
    with (
        patch("app.modules.health.router.check_dependencies", side_effect=error),
        TestClient(create_app()) as client,
    ):
        response = client.get("/api/v1/health/ready")
    assert response.status_code == 503
    assert "secret credential" not in response.text
    assert response.json()["error"]["requestId"] == response.headers["X-Request-ID"]


def test_unknown_route_has_structured_error_and_bounded_request_id():
    with TestClient(create_app()) as client:
        response = client.get("/missing", headers={"X-Request-ID": "x" * 1000})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "http_404"
    assert len(response.headers["X-Request-ID"]) <= 64


def test_unexpected_error_is_redacted():
    app = create_app()

    @app.get("/broken")
    def broken():
        raise RuntimeError("secret credential")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/broken")
    assert response.status_code == 500
    assert "secret credential" not in response.text


def test_validation_error_does_not_echo_input():
    app = create_app()

    @app.get("/validated")
    def validated(count: int):
        return {"count": count}

    with TestClient(app) as client:
        response = client.get("/validated?count=secret-value")
    assert response.status_code == 422
    assert "secret-value" not in response.text


def test_request_body_limit_replays_valid_body_and_rejects_oversized_streams():
    app = create_app(Settings(max_request_body_bytes=1024))

    @app.post("/echo")
    async def echo(request: Request) -> dict[str, int]:
        return {"size": len(await request.body())}

    with TestClient(app) as client:
        valid = client.post("/echo", content=b"x" * 1024)
        oversized = client.post("/echo", content=b"secret" * 200)
        streamed = client.post("/echo", content=iter([b"x" * 600, b"secret" * 100]))
    assert valid.status_code == 200
    assert valid.json() == {"size": 1024}
    for response in (oversized, streamed):
        assert response.status_code == 413
        assert response.json()["error"]["code"] == "request_too_large"
        assert response.json()["error"]["requestId"] == response.headers["X-Request-ID"]
        assert "secret" not in response.text


def test_cors_allows_only_configured_origins():
    with TestClient(create_app(Settings(cors_origins=["https://app.example.test"]))) as client:
        allowed = client.options(
            "/api/v1/health/live",
            headers={
                "Origin": "https://app.example.test",
                "Access-Control-Request-Method": "GET",
            },
        )
        denied = client.options(
            "/api/v1/health/live",
            headers={
                "Origin": "https://attacker.example.test",
                "Access-Control-Request-Method": "GET",
            },
        )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "https://app.example.test"
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers


def test_browser_can_read_profile_etag_and_send_if_match():
    origin = "https://app.example.test"
    app = create_app(Settings(cors_origins=[origin]))
    now = datetime.now(UTC)
    app.dependency_overrides[get_current_profile] = lambda: SimpleNamespace(
        id=uuid4(),
        email="learner@example.test",
        name="Learner",
        role="learner",
        preferences={},
        timezone="UTC",
        revision=1,
        created_at=now,
        updated_at=now,
    )

    with TestClient(app) as client:
        preflight = client.options(
            "/api/v1/me",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "PATCH",
                "Access-Control-Request-Headers": "authorization,content-type,if-match",
            },
        )
        response = client.get("/api/v1/me", headers={"Origin": origin})
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == origin
    allowed_headers = preflight.headers["access-control-allow-headers"].lower()
    assert "if-match" in allowed_headers
    assert "authorization" in allowed_headers
    assert response.headers["etag"] == '"rev-1"'
    assert "etag" in response.headers["access-control-expose-headers"].lower()
