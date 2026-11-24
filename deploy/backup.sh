#!/usr/bin/env bash
# Daily backup: database + uploaded files. Keeps the last 14 days.
# Cron (installed by install.sh): 30 3 * * * /opt/kerwen/deploy/backup.sh
set -euo pipefail
cd "$(dirname "$0")"
DIR="${BACKUP_DIR:-/var/backups/kerwen}"
STAMP="$(date +%Y%m%d-%H%M)"
mkdir -p "$DIR"
chmod 700 "$DIR"

docker compose exec -T db pg_dump -U kerwen -d kerwen -Fc > "$DIR/db-$STAMP.dump"
docker run --rm -v kerwen_media:/media:ro -v "$DIR":/backup alpine \
  tar czf "/backup/media-$STAMP.tar.gz" -C /media .

find "$DIR" -type f -mtime +14 -delete
echo "Backup OK: $DIR/db-$STAMP.dump"
# Tip: also copy $DIR to another computer/server from time to time.
