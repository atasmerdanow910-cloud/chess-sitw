#!/usr/bin/env bash
# Два сайта на одном сервере (nginx + HTTPS):
#   https://DOMAIN          → «VPN Python» (код из ветки ccr-0774bf1d-0dfpmd)
#   https://market.DOMAIN   → маркетплейс SystemMarket (объявления и фото сохраняются)
#
# Запуск от root (перед этим в DNS нужна запись A: market → IP сервера):
#   curl -fsSL https://raw.githubusercontent.com/atasmerdanow910-cloud/chess-sitw/<ветка>/marketplace/deploy/vpn-python.sh -o vpn-python.sh
#   BRANCH=<ветка или коммит> DOMAIN=sstymmarket.click bash vpn-python.sh
#
# Повторный запуск безопасен: обновит код, данные (скрипты, APK, фото, пароль) не трогает.
#   bash vpn-python.sh --password   — сменить пароль админки VPN Python
set -euo pipefail

DOMAIN="${DOMAIN:-sstymmarket.click}"
MARKET="${MARKET:-market.$DOMAIN}"
BRANCH="${BRANCH:-ccr-d10ab0ac-yrj6qu}"
VPN_REF="${VPN_REF:-125f2a31df81f00f69693e81d8994e4b1095dded}"
REPO="atasmerdanow910-cloud/chess-sitw"
VPN_DIR=/opt/vpn-python
VPN_USER=vpnpy
VPN_PORT="${VPN_PORT:-8090}"
SITE=/etc/nginx/sites-available/vpn-python
ACME_ROOT=/var/www/html

say()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✘ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Запустите от root"

run_app() {
  runuser -u "$VPN_USER" -- env DATA_DIR="$VPN_DIR/data" "$VPN_DIR/venv/bin/python" "$VPN_DIR/app.py" "$@"
}
ask_password() {
  local p1 p2
  while true; do
    read -r -s -p "Придумайте пароль для админки VPN Python (мин. 8 символов): " p1 </dev/tty; echo
    read -r -s -p "Повторите пароль: " p2 </dev/tty; echo
    if [ "${#p1}" -lt 8 ]; then echo "Слишком короткий, ещё раз."; continue; fi
    if [ "$p1" != "$p2" ]; then echo "Пароли не совпадают, ещё раз."; continue; fi
    break
  done
  printf '%s\n' "$p1" | run_app set-password --stdin
}

if [ "${1:-}" = "--password" ]; then
  [ -x "$VPN_DIR/venv/bin/python" ] || fail "VPN Python ещё не установлен"
  ask_password; systemctl restart vpn-python; ok "Пароль изменён"; exit 0
fi
[ -z "${1:-}" ] || fail "Неизвестный параметр: $1"

# Сертификат Let's Encrypt через webroot: временный блок nginx отвечает на проверку.
ensure_cert() {
  local host="$1"
  [ -f "/etc/letsencrypt/live/$host/fullchain.pem" ] && { ok "Сертификат для $host уже есть"; return 0; }
  local want have
  want="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')"
  have="$(getent ahostsv4 "$host" | awk 'NR==1{print $1}')"
  if [ -z "$have" ] || [ "$have" != "$want" ]; then
    echo
    echo "Домен $host ещё не указывает на этот сервер (${have:-нет записи})."
    echo "Добавьте в DNS у регистратора запись:  A   ${host%%.$DOMAIN}   ${want:-IP сервера}"
    echo "Подождите 10–30 минут и запустите этот скрипт снова."
    exit 1
  fi
  mkdir -p "$ACME_ROOT"
  cat > /etc/nginx/sites-enabled/zz-acme-temp <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $host;
    location /.well-known/acme-challenge/ { root $ACME_ROOT; }
    location / { return 404; }
}
EOF
  nginx -t 2>/dev/null || { rm -f /etc/nginx/sites-enabled/zz-acme-temp; nginx -t; fail "Ошибка nginx"; }
  systemctl reload nginx
  if certbot certonly --webroot -w "$ACME_ROOT" -n --agree-tos --register-unsafely-without-email --keep-until-expiring -d "$host"; then
    rm -f /etc/nginx/sites-enabled/zz-acme-temp; systemctl reload nginx
    ok "Сертификат для $host получен"
  else
    rm -f /etc/nginx/sites-enabled/zz-acme-temp; systemctl reload nginx
    fail "Не удалось получить сертификат для $host (см. текст выше)"
  fi
}

command -v certbot >/dev/null || fail "certbot не установлен (apt install -y certbot python3-certbot-nginx)"
command -v nginx >/dev/null || fail "nginx не установлен — сначала установите маркетплейс"

say "1/5 Сертификаты HTTPS"
ensure_cert "$DOMAIN"
ensure_cert "$MARKET"

say "2/5 Маркетплейс → https://$MARKET"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/marketplace/deploy/install.sh" -o "$TMP/market-install.sh"
DOMAIN="$MARKET" BRANCH="$BRANCH" bash "$TMP/market-install.sh"
ok "Маркетплейс переехал на $MARKET"

say "3/5 Скачиваю VPN Python"
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$VPN_REF" -o "$TMP/vpn.tgz"
tar -xzf "$TMP/vpn.tgz" -C "$TMP"
SRC="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d -name 'chess-sitw-*' | head -1)"
[ -f "$SRC/app.py" ] || fail "В архиве нет app.py"
id -u "$VPN_USER" >/dev/null 2>&1 || useradd --system --home-dir "$VPN_DIR" --shell /usr/sbin/nologin "$VPN_USER"
mkdir -p "$VPN_DIR/data"
rm -rf "$VPN_DIR/templates" "$VPN_DIR/static"
cp -r "$SRC"/*.py "$SRC/requirements.txt" "$SRC/templates" "$SRC/static" "$VPN_DIR/"
chown -R root:root "$VPN_DIR/templates" "$VPN_DIR/static" "$VPN_DIR"/*.py "$VPN_DIR/requirements.txt"
chown -R "$VPN_USER:$VPN_USER" "$VPN_DIR/data"
chmod 750 "$VPN_DIR/data"
[ -x "$VPN_DIR/venv/bin/python" ] || python3 -m venv "$VPN_DIR/venv"
"$VPN_DIR/venv/bin/pip" install -q --upgrade pip
"$VPN_DIR/venv/bin/pip" install -q -r "$VPN_DIR/requirements.txt"
ok "Код и библиотеки установлены"

say "4/5 Пароль админки и автозапуск"
if run_app has-password; then
  ok "Пароль уже задан (сменить: bash vpn-python.sh --password)"
else
  ask_password
fi
# «Адрес сайта» нужен для входа через Google — ставим, если ещё не задан
runuser -u "$VPN_USER" -- "$VPN_DIR/venv/bin/python" - "$VPN_DIR/data/site.db" "https://$DOMAIN" <<'PY'
import sqlite3, sys
con = sqlite3.connect(sys.argv[1])
row = con.execute("SELECT value FROM settings WHERE key = 'site_url'").fetchone()
if not row or not row[0]:
    con.execute("INSERT INTO settings(key, value) VALUES('site_url', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value", (sys.argv[2],))
    con.commit()
con.close()
PY
cat > /etc/systemd/system/vpn-python.service <<EOF
[Unit]
Description=VPN Python website
After=network.target

[Service]
User=$VPN_USER
Group=$VPN_USER
WorkingDirectory=$VPN_DIR
Environment=DATA_DIR=$VPN_DIR/data
ExecStart=$VPN_DIR/venv/bin/gunicorn --preload --workers 2 --worker-class gthread --threads 8 --timeout 600 --bind 127.0.0.1:$VPN_PORT app:app
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --quiet vpn-python
systemctl restart vpn-python
for _ in $(seq 1 15); do
  curl -fsS -o /dev/null "http://127.0.0.1:$VPN_PORT/" && break
  sleep 1
done
curl -fsS -o /dev/null "http://127.0.0.1:$VPN_PORT/" || { journalctl -u vpn-python -n 30 --no-pager; fail "VPN Python не запустился"; }
ok "VPN Python запущен (127.0.0.1:$VPN_PORT)"

say "5/5 nginx: $DOMAIN → VPN Python"
cat > "$SITE.new" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root $ACME_ROOT; }
    location / { return 301 https://\$host\$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN www.$DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 520m;
    client_body_timeout 600s;

    location / {
        proxy_pass http://127.0.0.1:$VPN_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
EOF
OLD=""
[ -f "$SITE" ] && OLD="$(mktemp)" && cp -a "$SITE" "$OLD"
mv "$SITE.new" "$SITE"
ln -sf "$SITE" /etc/nginx/sites-enabled/vpn-python
if nginx -t 2>/dev/null; then
  systemctl reload nginx
else
  nginx -t || true
  if [ -n "$OLD" ]; then cp -a "$OLD" "$SITE"; else rm -f "$SITE" /etc/nginx/sites-enabled/vpn-python; fi
  systemctl reload nginx || true
  fail "Ошибка в настройке nginx — вернул как было"
fi

sleep 1
check() {
  local code
  code="$(curl -sk -o /dev/null -w '%{http_code}' --resolve "$1:443:127.0.0.1" "https://$1$2" || true)"
  if [ "$code" = "200" ]; then ok "https://$1$2 — работает"; else echo "!! https://$1$2 — ответ $code"; fi
}
check "$DOMAIN" "/"
check "$DOMAIN" "/admin"
check "$MARKET" "/api/health"

printf '\n\033[1;32m════════════════════════════════════════════\033[0m\n'
printf '  VPN Python:    \033[1mhttps://%s/\033[0m\n' "$DOMAIN"
printf '  Его админка:   \033[1mhttps://%s/admin\033[0m\n' "$DOMAIN"
printf '  Маркетплейс:   \033[1mhttps://%s/\033[0m\n' "$MARKET"
printf '\033[1;32m════════════════════════════════════════════\033[0m\n'
echo "Логи VPN Python:  journalctl -u vpn-python -f"
