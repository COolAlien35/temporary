"""Catch direct coupling as modules are added, before it becomes a refactoring project."""

import ast
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "app"
FORBIDDEN_API_DEPENDENCIES = {"qiskit", "pennylane", "cirq", "qbraid", "openai"}


def imports(path):
    for node in ast.walk(ast.parse(path.read_text())):
        if isinstance(node, ast.Import):
            yield from (alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            yield node.module


def test_domain_modules_use_public_cross_module_interfaces():
    for path in (APP / "modules").rglob("*.py"):
        owner = path.relative_to(APP / "modules").parts[0]
        for name in imports(path):
            parts = name.split(".")
            if parts[:2] == ["app", "modules"] and len(parts) >= 4 and parts[2] != owner:
                assert parts[3] in {"public", "schemas"}, (
                    f"Private cross-module import: {path}: {name}"
                )


def test_routers_and_core_do_not_import_compute_or_provider_sdks():
    paths = [*(APP / "core").rglob("*.py"), *(APP / "modules").rglob("router.py")]
    for path in paths:
        for name in imports(path):
            assert name.split(".")[0] not in FORBIDDEN_API_DEPENDENCIES, (path, name)
