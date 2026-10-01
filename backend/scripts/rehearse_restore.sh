#!/bin/sh
# Rehearse a data-bearing PostgreSQL restore inside the disposable Compose database.
set -eu

if [ "${QL_RESTORE_REHEARSAL:-}" != "1" ]; then
  echo "Set QL_RESTORE_REHEARSAL=1 to run against the local Compose database" >&2
  exit 2
fi

docker compose exec -T db sh -s <<'DB_SCRIPT'
set -eu
export PGPASSWORD="$POSTGRES_PASSWORD"
restore_db="quantumloop_restore_$$"
dump_file="/tmp/${restore_db}.dump"
restore_created=0
sentinel=""

cleanup() {
  set +e
  if [ -n "$sentinel" ]; then
    psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q \
      -c "DELETE FROM profiles WHERE id = '$sentinel'" >/dev/null
  fi
  if [ "$restore_created" -eq 1 ]; then
    dropdb -h 127.0.0.1 -U "$POSTGRES_USER" "$restore_db"
  fi
  rm -f "$dump_file"
}
trap cleanup EXIT

sentinel=$(psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atq \
  -c 'SELECT gen_random_uuid()')
psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q \
  -c "INSERT INTO profiles (id, auth_subject, email, name, role, preferences) VALUES ('$sentinel', '$sentinel', 'restore-rehearsal@example.test', 'Restore rehearsal', 'learner', '{}'::jsonb)"

pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -F c -f "$dump_file" "$POSTGRES_DB"
psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q \
  -c "DELETE FROM profiles WHERE id = '$sentinel'"
createdb -h 127.0.0.1 -U "$POSTGRES_USER" -T template0 "$restore_db"
restore_created=1
pg_restore -h 127.0.0.1 -U "$POSTGRES_USER" --exit-on-error \
  --no-owner --no-privileges -d "$restore_db" "$dump_file"

restored_rows=$(psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$restore_db" -Atq \
  -c "SELECT count(*) FROM profiles WHERE id = '$sentinel' AND name = 'Restore rehearsal'")
source_version=$(psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atq \
  -c 'SELECT version_num FROM alembic_version')
restored_version=$(psql -h 127.0.0.1 -U "$POSTGRES_USER" -d "$restore_db" -Atq \
  -c 'SELECT version_num FROM alembic_version')
test "$restored_rows" = 1
test -n "$source_version"
test "$source_version" = "$restored_version"
echo "Restore rehearsal passed: saved profile and Alembic version recovered"
DB_SCRIPT
