#!/usr/bin/env bash
# Checks that the latest backup can really be restored (into a temporary database).
set -euo pipefail
cd "$(dirname "$0")"
DIR="${BACKUP_DIR:-/var/backups/kerwen}"
LATEST="$(ls -1t "$DIR"/db-*.dump | head -n 1)"
echo "Testing $LATEST"
docker compose exec -T db psql -U kerwen -d postgres -c "DROP DATABASE IF EXISTS restore_test;" >/dev/null
docker compose exec -T db psql -U kerwen -d postgres -c "CREATE DATABASE restore_test;" >/dev/null
docker compose exec -T db pg_restore -U kerwen -d restore_test --no-owner < "$LATEST"
docker compose exec -T db psql -U kerwen -d restore_test -tAc \
  "select 'users=' || count(*) from users union all select 'shops=' || count(*) from shops union all select 'products=' || count(*) from products union all select 'orders=' || count(*) from orders;"
docker compose exec -T db psql -U kerwen -d postgres -c "DROP DATABASE restore_test;" >/dev/null
echo "Restore test OK"
