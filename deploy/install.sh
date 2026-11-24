#!/usr/bin/env bash
# One-time setup on a fresh Ubuntu 22.04/24.04 server (run as root):
#   git clone <repo> /opt/kerwen && cd /opt/kerwen/deploy && sudo ./install.sh api.yourdomain.com
set -euo pipefail
DOMAIN="${1:?Usage: ./install.sh api.yourdomain.com}"
cd "$(dirname "$0")"

echo "==> Installing Docker"
if ! command -v docker >/dev/null; then
  apt-get update
  apt-get install -y docker.io docker-compose-v2 openssl ufw cron
  systemctl enable --now docker
fi

echo "==> Swap (needed on small 512 MB servers)"
if [ "$(swapon --show | wc -l)" -eq 0 ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Firewall: only SSH, HTTP, HTTPS"
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable

echo "==> Secrets"
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s|^DOMAIN=.*|DOMAIN=$DOMAIN|" .env
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
  sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" .env
  sed -i "s|^MEDIA_SIGNING_SECRET=.*|MEDIA_SIGNING_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" .env
  chmod 600 .env
fi

echo "==> Start"
docker compose up -d --build

echo "==> Daily backup at 03:30"
chmod +x backup.sh restore.sh restore-test.sh
( crontab -l 2>/dev/null | grep -v kerwen; echo "30 3 * * * $(pwd)/backup.sh >> /var/log/kerwen-backup.log 2>&1" ) | crontab -

echo
echo "Done. Check: curl https://$DOMAIN/health"
echo "Create the owner account:  docker compose exec api node dist/src/scripts/create-owner.js"
