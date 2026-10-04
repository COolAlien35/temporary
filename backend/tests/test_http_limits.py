import asyncio

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.http_limits import BodyLimitMiddleware
from app.main import create_app


def test_large_content_length_is_rejected_before_auth_with_cors_and_request_id():
    origin = "https://web.example.test"
    with TestClient(create_app(Settings(cors_origins=[origin]))) as client:
        response = client.post(
            "/api/v1/circuits",
            content=b"x" * 262145,
            headers={
                "Origin": origin,
                "X-Request-ID": "large-request",
            },
        )
    assert response.status_code == 413
    assert response.json()["error"]["requestId"] == "large-request"
    assert response.headers["Access-Control-Allow-Origin"] == origin
    assert response.headers["Cache-Control"] == "no-store"


def test_chunked_body_cannot_bypass_limit():
    messages = iter(
        [
            {"type": "http.request", "body": b"12345", "more_body": True},
            {"type": "http.request", "body": b"6789", "more_body": False},
        ]
    )
    output = []

    async def receive():
        return next(messages)

    async def send(message):
        output.append(message)

    async def app(scope, receive, send):
        raise AssertionError("Oversized bodies must not reach the application")

    asyncio.run(BodyLimitMiddleware(app, 8)({"type": "http", "headers": []}, receive, send))
    assert output[0]["status"] == 413


def test_chunked_body_is_preserved_for_the_application():
    messages = iter(
        [
            {"type": "http.request", "body": b"123", "more_body": True},
            {"type": "http.request", "body": b"456", "more_body": False},
        ]
    )
    output = []

    async def receive():
        return next(messages)

    async def send(message):
        output.append(message)

    async def app(scope, receive, send):
        output.append(await receive())

    asyncio.run(BodyLimitMiddleware(app, 8)({"type": "http", "headers": []}, receive, send))
    assert output == [{"type": "http.request", "body": b"123456", "more_body": False}]
