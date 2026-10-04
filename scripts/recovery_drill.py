"""Exercise local PostgreSQL restore and worker interruption without touching existing data."""

import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]


def run(*arguments, input=None, stdout=subprocess.PIPE):
    result = subprocess.run(
        ["docker", "compose", *arguments],
        cwd=ROOT,
        input=input,
        stdout=stdout,
        stderr=subprocess.PIPE,
        check=False,
        timeout=360,
    )
    if result.returncode:
        raise RuntimeError(
            f"Local recovery command failed: {arguments[0]} (inspect container logs)"
        )
    return result.stdout


def sql(database, statement):
    return (
        run(
            "exec",
            "-T",
            "db",
            "psql",
            "-U",
            "quantumloop",
            "-d",
            database,
            "-v",
            "ON_ERROR_STOP=1",
            "-At",
            input=statement.encode(),
        )
        .decode()
        .strip()
    )


def main():
    suffix = uuid4().hex
    source, restored = f"ql_drill_source_{suffix}", f"ql_drill_restored_{suffix}"
    created = []
    try:
        for database in (source, restored):
            sql("quantumloop", f'CREATE DATABASE "{database}";')
            created.append(database)
        run(
            "run",
            "--rm",
            "-e",
            f"QL_DATABASE_URL=postgresql+psycopg://quantumloop:quantumloop@db:5432/{source}",
            "migrate",
            "alembic",
            "upgrade",
            "head",
        )
        owner, circuit, revision = str(uuid4()), str(uuid4()), str(uuid4())
        snapshot = json.dumps(
            {"schema_version": 1, "name": "Restore drill", "qubits": 1, "gates": []},
            sort_keys=True,
            separators=(",", ":"),
        )
        checksum = hashlib.sha256(snapshot.encode()).hexdigest()
        sql(
            source,
            f"""
          INSERT INTO profiles (id,auth_subject,email,name,role,preferences)
          VALUES ('{owner}','{uuid4()}','drill@example.test','Restore drill','learner','{{}}');
          INSERT INTO circuits (id,owner_id,name,current_revision,idempotency_key,request_hash,archived)
          VALUES ('{circuit}','{owner}','Restore drill',1,'{uuid4()}','{checksum}',true);
          INSERT INTO circuit_revisions (id,circuit_id,revision,snapshot,checksum_sha256)
          VALUES ('{revision}','{circuit}',1,'{snapshot}','{checksum}');
        """,
        )
        with tempfile.TemporaryDirectory(prefix="ql-recovery-") as directory:
            backup = Path(directory) / "database.dump"
            with backup.open("wb") as output:
                backup.chmod(0o600)
                run(
                    "exec",
                    "-T",
                    "db",
                    "pg_dump",
                    "-U",
                    "quantumloop",
                    "-d",
                    source,
                    "-Fc",
                    "--no-owner",
                    "--no-acl",
                    stdout=output,
                )
            run(
                "exec",
                "-T",
                "db",
                "pg_restore",
                "-U",
                "quantumloop",
                "-d",
                restored,
                "--no-owner",
                "--no-acl",
                "--exit-on-error",
                input=backup.read_bytes(),
            )
        query = "SELECT c.id,c.owner_id,c.archived,r.checksum_sha256,r.snapshot FROM circuits c JOIN circuit_revisions r ON r.circuit_id=c.id; SELECT version_num FROM alembic_version;"
        assert sql(source, query) == sql(restored, query), (
            "Restore changed owner, archive, revision or checksum data"
        )
        run(
            "run",
            "--rm",
            "-e",
            f"QL_DATABASE_URL=postgresql+psycopg://quantumloop:quantumloop@db:5432/{restored}",
            "migrate",
            "alembic",
            "check",
        )
        print(
            "PostgreSQL backup/restore passed: ownership, archived snapshot/checksum and migration head preserved."
        )
    finally:
        for database in reversed(created):
            sql("quantumloop", f'DROP DATABASE "{database}" WITH (FORCE);')

    marker = str(uuid4())
    try:
        run("stop", "-t", "330", "worker")
        task_id = (
            run(
                "exec",
                "-T",
                "api",
                "python",
                "-c",
                f"from app.jobs.celery_app import celery_app; print(celery_app.send_task('quantumloop.ping', args=['{marker}'], ignore_result=False).id)",
            )
            .decode()
            .strip()
        )
        task_id = str(__import__("uuid").UUID(task_id))
        run("start", "worker")
        run(
            "exec",
            "-T",
            "api",
            "python",
            "-c",
            f"from celery.result import AsyncResult; from app.jobs.celery_app import celery_app; r=AsyncResult('{task_id}',app=celery_app); assert r.get(timeout=60)=='{marker}'; r.forget()",
        )
        print(
            "Worker interruption passed: a task submitted while the worker was stopped completed after restart."
        )
    finally:
        run("start", "worker")


if __name__ == "__main__":
    main()
