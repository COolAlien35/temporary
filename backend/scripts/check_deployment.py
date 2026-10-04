"""Validate repository deployment wiring without credentials or provider writes."""

import json
from pathlib import Path

import yaml

from app.core.config import Settings

ROOT = Path(__file__).resolve().parents[2]


def validate() -> None:
    document = yaml.safe_load((ROOT / "render.yaml").read_text())
    services = {service["name"]: service for service in document["services"]}
    expected = {
        "quantumloop-api",
        "quantumloop-worker",
        "quantumloop-dispatcher",
        "quantumloop-web",
        "quantumloop-broker",
        "quantumloop-cache",
    }
    assert set(services) == expected, (
        "Deployment must include API, worker, dispatcher, web, and separate broker/cache"
    )
    assert services["quantumloop-broker"]["maxmemoryPolicy"] == "noeviction"
    assert services["quantumloop-broker"]["persistenceMode"] == "journal-snapshot"
    assert services["quantumloop-cache"]["persistenceMode"] == "off"
    for name in ("quantumloop-broker", "quantumloop-cache"):
        assert services[name]["ipAllowList"] == [], "Redis must remain private"
    for name, service in services.items():
        if service["type"] == "keyvalue":
            continue
        assert service["autoDeployTrigger"] == "off", "Releases require migration ordering"
        variables = {item["key"]: item for item in service["envVars"]}
        for item in variables.values():
            if "value" in item:
                assert isinstance(item["value"], str), f"{name}: env values must be strings"
            if "fromService" in item:
                reference = item["fromService"]
                assert reference["name"] in services
                if "envVarKey" in reference:
                    referenced = {item["key"] for item in services[reference["name"]]["envVars"]}
                    assert reference["envVarKey"] in referenced
        if name == "quantumloop-web":
            assert variables["REQUIRE_CONNECTED_CONFIG"]["value"] == "true"
            for key in (
                "NEXT_PUBLIC_SUPABASE_URL",
                "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
                "NEXT_PUBLIC_QUANTUMLOOP_API_URL",
            ):
                assert variables[key]["sync"] is False
            continue
        # Resolve prompted values and service references to safe stand-ins. This
        # catches startup validation failures without using or printing secrets.
        values = {}
        for key, item in variables.items():
            if not key.startswith("QL_"):
                continue
            if "value" in item:
                value = item["value"]
            elif key == "QL_DATABASE_URL":
                value = (
                    "postgresql+psycopg://operator:example@db.example.test/release?sslmode=require"
                )
            elif key == "QL_AUTH_ISSUER":
                value = "https://release.supabase.co/auth/v1"
            elif key == "QL_CORS_ORIGINS":
                value = '["https://web.example.test"]'
            else:
                value = f"redis://{item['fromService']['name']}:6379/0"
            values[key[3:].lower()] = json.loads(value) if key == "QL_CORS_ORIGINS" else value
        Settings(_env_file=None, **values)
        assert variables["RUNTIME_STAGE"]["value"] == (
            "worker" if name == "quantumloop-worker" else "runtime"
        )
    assert services["quantumloop-api"]["preDeployCommand"] == "alembic upgrade head"
    assert services["quantumloop-api"]["healthCheckPath"] == "/api/v1/health/ready"
    assert services["quantumloop-worker"]["maxShutdownDelaySeconds"] >= 300
    print("Deployment wiring and production service settings passed (no live credentials used).")


if __name__ == "__main__":
    validate()
