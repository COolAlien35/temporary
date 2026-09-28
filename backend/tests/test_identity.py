import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.testclient import TestClient
from jwt.algorithms import RSAAlgorithm
from jwt.exceptions import PyJWKClientConnectionError

from app.core.config import Settings
from app.main import create_app
from app.modules.identity.public import jwks_client, verify_access_token
from app.modules.identity.schemas import ProfilePatch

ISSUER = "https://example.supabase.co/auth/v1"


@pytest.fixture
def signer(monkeypatch):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk = json.loads(RSAAlgorithm.to_jwk(key.public_key()))
    public_jwk.update({"kid": "test-key", "alg": "RS256", "use": "sig"})
    jwks_client.cache_clear()
    monkeypatch.setattr(
        "jwt.jwks_client.PyJWKClient.fetch_data", lambda self: {"keys": [public_jwk]}
    )

    def issue(**overrides):
        now = datetime.now(UTC)
        claims = {
            "sub": str(uuid4()),
            "email": "LEARNER@example.test",
            "role": "authenticated",
            "iss": ISSUER,
            "aud": "authenticated",
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        claims.update(overrides)
        return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "test-key"})

    yield issue
    jwks_client.cache_clear()


def test_valid_provider_token_extracts_identity(signer):
    identity = verify_access_token(signer(), Settings(auth_issuer=ISSUER))
    assert identity.email == "learner@example.test"


@pytest.mark.parametrize(
    "override",
    [
        {"aud": "other"},
        {"iss": "https://attacker.example.test/auth/v1"},
        {"role": "service_role"},
        {"is_anonymous": True},
        {"email": "invalid"},
        {"exp": datetime.now(UTC) - timedelta(minutes=2)},
    ],
)
def test_rejects_untrusted_or_expired_claims(signer, override):
    with pytest.raises(HTTPException) as error:
        verify_access_token(signer(**override), Settings(auth_issuer=ISSUER))
    assert error.value.status_code == 401


def test_unknown_signing_key_fails_closed(signer):
    token = signer()
    jwks_client.cache_clear()
    with pytest.MonkeyPatch.context() as patch:
        patch.setattr("jwt.jwks_client.PyJWKClient.fetch_data", lambda self: {"keys": []})
        with pytest.raises(HTTPException) as error:
            verify_access_token(token, Settings(auth_issuer=ISSUER))
    assert error.value.status_code == 401


def test_unconfigured_auth_fails_closed(signer):
    with pytest.raises(HTTPException) as error:
        verify_access_token(signer(), Settings(auth_issuer=None))
    assert error.value.status_code == 503


def test_jwks_provider_outage_is_503(signer):
    token = signer()
    jwks_client.cache_clear()

    def unavailable(_self):
        raise PyJWKClientConnectionError("unavailable")

    with pytest.MonkeyPatch.context() as patch:
        patch.setattr("jwt.jwks_client.PyJWKClient.fetch_data", unavailable)
        with pytest.raises(HTTPException) as error:
            verify_access_token(token, Settings(auth_issuer=ISSUER))
    assert error.value.status_code == 503


def test_me_requires_bearer_token():
    with TestClient(create_app()) as client:
        response = client.get("/api/v1/me")
    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_profile_patch_rejects_role_and_blank_name():
    with pytest.raises(ValueError):
        ProfilePatch.model_validate({"role": "instructor"})
    with pytest.raises(ValueError):
        ProfilePatch.model_validate({"name": "   "})
    with pytest.raises(ValueError):
        ProfilePatch.model_validate({"timezone": "Invalid/Planet"})
