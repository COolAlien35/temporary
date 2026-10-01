"""Run the hosted learner API journey with two real Supabase accounts.

Credentials are read only from the environment and are never printed.
"""

import argparse
import json
import os
import sys
import time
from contextlib import suppress
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import uuid4


class SmokeFailure(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(
        self, request: Request, fp: Any, code: int, msg: str, headers: Any, newurl: str
    ) -> None:
        return None


OPENER = build_opener(NoRedirect)


def valid_https_origin(value: str) -> bool:
    parsed = urlsplit(value)
    return bool(
        parsed.scheme == "https"
        and parsed.netloc
        and not parsed.path
        and not parsed.query
        and not parsed.fragment
        and not parsed.username
        and not parsed.password
    )


def sign_in_test_account(base: str, publishable_key: str, email: str, password: str) -> str:
    """Exchange test credentials for a short-lived token without logging response bodies."""
    call = Request(
        f"{base}/auth/v1/token?grant_type=password",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "apikey": publishable_key,
        },
        method="POST",
    )
    try:
        with OPENER.open(call, timeout=20) as response:
            raw = response.read()
            status = response.status
    except HTTPError as exc:
        raise SmokeFailure(f"Supabase test-account sign-in failed (HTTP {exc.code})") from None
    except (URLError, TimeoutError):
        raise SmokeFailure("Supabase test-account sign-in failed (network error)") from None
    if status != 200:
        raise SmokeFailure(f"Supabase test-account sign-in failed (HTTP {status})")
    try:
        payload = json.loads(raw)
    except ValueError:
        raise SmokeFailure("Supabase sign-in response is not JSON") from None
    token = payload.get("access_token") if isinstance(payload, dict) else None
    if not isinstance(token, str) or not token:
        raise SmokeFailure("Supabase sign-in response has no access token")
    return token


def request(
    base: str,
    path: str,
    *,
    token: str | None = None,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    expected: int = 200,
) -> dict[str, Any]:
    headers = {"Accept": "application/json"}
    if token is not None:
        headers["Authorization"] = f"Bearer {token}"
    if body is not None:
        headers["Content-Type"] = "application/json"
        headers["Idempotency-Key"] = str(uuid4())
    payload = json.dumps(body).encode() if body is not None else None
    call = Request(f"{base}{path}", data=payload, headers=headers, method=method)
    try:
        with OPENER.open(call, timeout=20) as response:
            status = response.status
            raw = response.read()
    except HTTPError as exc:
        status = exc.code
        raw = exc.read()
    except (URLError, TimeoutError) as exc:
        raise SmokeFailure(f"{method} {path}: network failure ({type(exc).__name__})") from None
    if status != expected:
        code = ""
        with suppress(ValueError, AttributeError):
            code = json.loads(raw).get("error", {}).get("code", "")
        raise SmokeFailure(f"{method} {path}: expected {expected}, got {status} {code}".strip())
    if not raw:
        return {}
    try:
        result = json.loads(raw)
    except ValueError:
        raise SmokeFailure(f"{method} {path}: response is not JSON") from None
    if not isinstance(result, dict):
        raise SmokeFailure(f"{method} {path}: response is not an object")
    return result


def require(value: bool, message: str) -> None:
    if not value:
        raise SmokeFailure(message)


def run(base: str, token_a: str, token_b: str, *, tutor: bool, deadline: int) -> None:
    require(request(base, "/api/v1/health/live").get("status") == "ok", "Liveness failed")
    require(
        request(base, "/api/v1/health/ready").get("status") == "ready",
        "Readiness failed",
    )
    a = request(base, "/api/v1/me", token=token_a)
    b = request(base, "/api/v1/me", token=token_b)
    require(a.get("id") != b.get("id"), "Tokens resolve to the same account")
    print("PASS health and separate account identities", flush=True)

    lesson = request(base, "/api/v1/curriculum/units/u1", token=token_a)
    require(
        any(item.get("id") == "u1-quantum-foundations" for item in lesson.get("lessons", [])),
        "Supported lesson missing",
    )
    circuit = request(
        base,
        "/api/v1/circuits",
        token=token_a,
        method="POST",
        body={
            "name": f"Deployment smoke {uuid4().hex[:8]}",
            "qubits": 1,
            "gates": [{"id": "h", "type": "H", "step": 0, "qubit": 0}],
        },
        expected=201,
    )
    circuit_id = circuit["id"]
    require(circuit.get("revision") == 1, "Saved circuit revision mismatch")
    request(base, f"/api/v1/circuits/{circuit_id}", token=token_b, expected=404)

    learning = request(
        base,
        "/api/v1/learning-sessions",
        token=token_a,
        method="POST",
        body={"lesson_id": "u1-quantum-foundations", "lesson_version": 1},
        expected=201,
    )
    session_id = learning["id"]
    request(base, f"/api/v1/learning-sessions/{session_id}", token=token_b, expected=404)
    prediction = request(
        base,
        f"/api/v1/learning-sessions/{session_id}/predictions",
        token=token_a,
        method="POST",
        body={
            "schema_version": 1,
            "lesson_id": "u1-quantum-foundations",
            "lesson_version": 1,
            "learning_session_id": session_id,
            "prediction_vector": [0.5, 0.5],
            "basis_labels": ["0", "1"],
            "measurement_qubits": [0],
            "comparison_basis": "ideal_probability",
        },
        expected=201,
    )
    prediction_id = prediction["id"]
    request(base, f"/api/v1/predictions/{prediction_id}", token=token_b, expected=404)
    print("PASS saved lesson, circuit, prediction, and owner isolation", flush=True)

    accepted = request(
        base,
        "/api/v1/experiments/runs",
        token=token_a,
        method="POST",
        body={
            "circuit_id": circuit_id,
            "circuit_revision": 1,
            "backend": "qiskit_aer",
            "shots": 128,
            "seed": 7,
            "prediction_id": prediction_id,
        },
        expected=202,
    )
    run_id = accepted["resource_id"]
    request(base, f"/api/v1/experiments/runs/{run_id}", token=token_b, expected=404)
    request(base, f"/api/v1/jobs/{run_id}", token=token_b, expected=404)
    until = time.monotonic() + deadline
    while time.monotonic() < until:
        saved = request(base, f"/api/v1/experiments/runs/{run_id}", token=token_a)
        if saved.get("status") == "succeeded":
            break
        if saved.get("status") in {"failed", "cancelled"}:
            raise SmokeFailure(f"Aer run ended as {saved['status']}")
        time.sleep(3)
    else:
        raise SmokeFailure("Aer run did not finish before the deadline")
    require(saved.get("result", {}).get("backend") == "qiskit_aer", "Aer result missing")
    require(sum(saved["result"]["counts"].values()) == 128, "Shot count mismatch")
    pair = request(base, f"/api/v1/predictions/{prediction_id}/pair", token=token_a)
    require(pair.get("run_id") == run_id, "Prediction paired to another run")
    require(pair.get("metric_version") == "tvd-v1", "Comparison metric mismatch")
    require(abs(pair.get("prediction_match", -1) - 1.0) < 1e-9, "Bell prediction mismatch")
    request(base, f"/api/v1/predictions/{prediction_id}/pair", token=token_b, expected=404)
    print("PASS Aer worker, saved result, comparison, and owner isolation", flush=True)

    if tutor:
        message = request(
            base,
            f"/api/v1/learning-sessions/{session_id}/tutor/messages",
            token=token_a,
            method="POST",
            body={
                "action": "explain",
                "stage": "observe",
                "prompt": "Explain why this H-gate result has equal probabilities.",
                "run_id": run_id,
            },
            expected=201,
        )
        require(message.get("status") == "completed", "Tutor did not complete")
        require(bool(message.get("response_text")), "Tutor response missing")
        require(run_id in message.get("source_record_ids", []), "Tutor source run missing")
        request(base, f"/api/v1/tutor/messages/{message['id']}", token=token_b, expected=404)
        print("PASS run-grounded tutor and owner isolation", flush=True)
    print("PASS hosted learner API smoke", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tutor", action="store_true", help="Exercise the paid tutor provider")
    parser.add_argument(
        "--supabase-login",
        action="store_true",
        help="Sign in both test accounts using QL_SMOKE_EMAIL/PASSWORD_A/B",
    )
    parser.add_argument("--deadline", type=int, default=180, help="Aer wait in seconds")
    args = parser.parse_args()
    base = os.environ.get("QL_SMOKE_API_URL", "").rstrip("/")
    token_a = os.environ.get("QL_SMOKE_TOKEN_A", "")
    token_b = os.environ.get("QL_SMOKE_TOKEN_B", "")
    if not valid_https_origin(base):
        parser.error("QL_SMOKE_API_URL must be a public HTTPS origin without a path")
    if not args.supabase_login and (not token_a or not token_b):
        parser.error("Set QL_SMOKE_TOKEN_A and QL_SMOKE_TOKEN_B from separate Supabase accounts")
    if args.supabase_login:
        supabase_url = os.environ.get("QL_SMOKE_SUPABASE_URL", "").rstrip("/")
        publishable_key = os.environ.get("QL_SMOKE_SUPABASE_PUBLISHABLE_KEY", "")
        email_a = os.environ.get("QL_SMOKE_EMAIL_A", "")
        password_a = os.environ.get("QL_SMOKE_PASSWORD_A", "")
        email_b = os.environ.get("QL_SMOKE_EMAIL_B", "")
        password_b = os.environ.get("QL_SMOKE_PASSWORD_B", "")
        if not valid_https_origin(supabase_url):
            parser.error("QL_SMOKE_SUPABASE_URL must be a public HTTPS origin")
        if not all((publishable_key, email_a, password_a, email_b, password_b)):
            parser.error("Set the Supabase publishable key and both QL_SMOKE_EMAIL/PASSWORD_A/B")
    if args.deadline < 1:
        parser.error("--deadline must be positive")
    try:
        if args.supabase_login:
            token_a = sign_in_test_account(supabase_url, publishable_key, email_a, password_a)
            token_b = sign_in_test_account(supabase_url, publishable_key, email_b, password_b)
        run(base, token_a, token_b, tutor=args.tutor, deadline=args.deadline)
    except (SmokeFailure, KeyError, TypeError, ValueError) as exc:
        print(f"FAIL {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
