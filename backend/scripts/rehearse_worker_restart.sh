#!/bin/sh
set -eu

if [ "${QL_WORKER_RESTART_REHEARSAL:-}" != 1 ]; then
  echo 'Set QL_WORKER_RESTART_REHEARSAL=1 to stop the local Compose worker.' >&2
  exit 2
fi

rehearsal_id=$(python3 -c 'from uuid import uuid4; print(uuid4())')
restart_worker() {
  docker compose start worker >/dev/null
}
trap restart_worker EXIT HUP INT TERM

docker compose stop worker
docker compose --profile test run --no-deps --rm \
  -e QL_REHEARSAL_ID="$rehearsal_id" test python -c '
import os
from app.jobs.celery_app import celery_app

identifier = os.environ["QL_REHEARSAL_ID"]
receipt = celery_app.send_task("quantumloop.ping", args=[identifier], task_id=identifier)
assert receipt.id == identifier
assert receipt.state == "PENDING"
'
docker compose start worker
docker compose --profile test run --no-deps --rm \
  -e QL_REHEARSAL_ID="$rehearsal_id" test python -c '
import os
from celery.result import AsyncResult
from app.jobs.celery_app import celery_app

identifier = os.environ["QL_REHEARSAL_ID"]
receipt = AsyncResult(identifier, app=celery_app)
try:
    assert receipt.get(timeout=90) == identifier
finally:
    receipt.forget()
'
trap - EXIT HUP INT TERM
echo 'PASS queued diagnostic task survived worker downtime and completed after restart'
