from io import BytesIO
from urllib.error import HTTPError

import pytest

from scripts import deployment_smoke


class AuthResponse(BytesIO):
    status = 200


def test_supabase_login_uses_publishable_key_and_returns_only_access_token(monkeypatch):
    class Opener:
        def open(self, call, timeout):
            assert call.full_url == "https://project.supabase.co/auth/v1/token?grant_type=password"
            assert call.get_header("Apikey") == "public-key"
            assert call.data == b'{"email": "learner@example.test", "password": "test-password"}'
            assert timeout == 20
            return AuthResponse(b'{"access_token":"test-token","refresh_token":"private"}')

    monkeypatch.setattr(deployment_smoke, "OPENER", Opener())
    assert (
        deployment_smoke.sign_in_test_account(
            "https://project.supabase.co", "public-key", "learner@example.test", "test-password"
        )
        == "test-token"
    )


def test_supabase_login_failure_does_not_expose_credentials_or_provider_body(monkeypatch):
    class Opener:
        def open(self, _call, timeout):
            assert timeout == 20
            raise HTTPError(
                "https://project.supabase.co/auth/v1/token?grant_type=password",
                400,
                "private-password",
                {},
                BytesIO(b'{"error":"private-provider-detail"}'),
            )

    monkeypatch.setattr(deployment_smoke, "OPENER", Opener())
    with pytest.raises(deployment_smoke.SmokeFailure, match="HTTP 400") as error:
        deployment_smoke.sign_in_test_account(
            "https://project.supabase.co", "public-key", "learner@example.test", "private-password"
        )
    assert "private-password" not in str(error.value)
    assert "private-provider-detail" not in str(error.value)


def test_supabase_login_mode_passes_separate_tokens_to_api_smoke(monkeypatch):
    monkeypatch.setenv("QL_SMOKE_API_URL", "https://api.example.test")
    monkeypatch.setenv("QL_SMOKE_SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("QL_SMOKE_SUPABASE_PUBLISHABLE_KEY", "public-key")
    monkeypatch.setenv("QL_SMOKE_EMAIL_A", "a@example.test")
    monkeypatch.setenv("QL_SMOKE_PASSWORD_A", "password-a")
    monkeypatch.setenv("QL_SMOKE_EMAIL_B", "b@example.test")
    monkeypatch.setenv("QL_SMOKE_PASSWORD_B", "password-b")
    monkeypatch.setattr("sys.argv", ["deployment_smoke.py", "--supabase-login", "--tutor"])
    seen = []

    def login(_base, _key, email, _password):
        seen.append(email)
        return f"token-{email}"

    def run(_base, token_a, token_b, *, tutor, deadline):
        assert token_a == "token-a@example.test"
        assert token_b == "token-b@example.test"
        assert tutor is True
        assert deadline == 180

    monkeypatch.setattr(deployment_smoke, "sign_in_test_account", login)
    monkeypatch.setattr(deployment_smoke, "run", run)
    assert deployment_smoke.main() == 0
    assert seen == ["a@example.test", "b@example.test"]
