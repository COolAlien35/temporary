from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError as RedisConnectionError
from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.main import create_app


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
