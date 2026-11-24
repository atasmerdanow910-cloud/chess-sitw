#!/usr/bin/env bash
# DANGER: replaces the live database with a backup. Usage: ./restore.sh /var/backups/kerwen/db-YYYYMMDD-HHMM.dump
set -euo pipefail
cd "$(dirname "$0")"
FILE="${1:?Give the backup file, e.g. ./restore.sh /var/backups/kerwen/db-20261124-0330.dump}"
read -r -p "This REPLACES all current data with $FILE. Type YES to continue: " answer
[ "$answer" = "YES" ] || { echo "Cancelled"; exit 1; }
docker compose stop api
docker compose exec -T db pg_restore -U kerwen -d kerwen --clean --if-exists --no-owner < "$FILE"
docker compose start api
echo "Restored from $FILE"
