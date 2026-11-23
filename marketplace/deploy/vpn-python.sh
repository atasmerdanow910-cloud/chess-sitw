#!/usr/bin/env bash
# Маркетплейс и «VPN Python» на одном сервере (nginx + HTTPS):
#   https://DOMAIN           → маркетплейс SystemMarket
#   https://DOMAIN/admin     → админка VPN Python
#   https://market.DOMAIN    → сайт VPN Python (папка vpn-python/ этой же ветки)
#
# Перед запуском в DNS нужна запись A: market → IP сервера.
# Запуск от root:
#   curl -fsSL https://raw.githubusercontent.com/atasmerdanow910-cloud/chess-sitw/<ветка>/marketplace/deploy/vpn-python.sh -o vpn-python.sh
#   BRANCH=<ветка или коммит> DOMAIN=sstymmarket.click bash vpn-python.sh
#
# Повторный запуск безопасен: обновит код; объявления, фото, скрипты, APK и пароли сохраняются.
#   bash vpn-python.sh --password   — сменить пароль админки VPN Python
set -euo pipefail

DOMAIN="${DOMAIN:-sstymmarket.click}"
VPN_HOST="${VPN_HOST:-market.$DOMAIN}"
BRANCH="${BRANCH:-ccr-d10ab0ac-yrj6qu}"
VPN_REF="${VPN_REF:-$BRANCH}"   # VPN Python лежит в той же ветке/коммите, что и маркетплейс
REPO="atasmerdanow910-cloud/chess-sitw"
VPN_DIR=/opt/vpn-python
VPN_USER=vpnpy
VPN_PORT="${VPN_PORT:-8090}"
SITE=/etc/nginx/sites-available/vpn-python
SNIPPET=/etc/nginx/snippets/systemmarket-vpn-admin.conf
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

case "${1:-}" in
  --password)
    [ -x "$VPN_DIR/venv/bin/python" ] || fail "VPN Python ещё не установлен"
    ask_password; systemctl restart vpn-python; ok "Пароль изменён"; exit 0 ;;
  "") ;;
  *) fail "Неизвестный параметр: $1" ;;
esac

command -v certbot >/dev/null || fail "certbot не установлен (apt install -y certbot python3-certbot-nginx)"
command -v nginx >/dev/null || fail "nginx не установлен — сначала установите маркетплейс"

ipv4_of() { getent ahostsv4 "$1" 2>/dev/null | awk 'NR==1{print $1}' || true; }

# Сертификат Let's Encrypt через webroot: временный блок nginx отвечает на проверку.
ensure_cert() {
  local host="$1" want have
  if [ -f "/etc/letsencrypt/live/$host/fullchain.pem" ]; then ok "Сертификат для $host уже есть"; return 0; fi
  want="$(ipv4_of "$DOMAIN")"
  have="$(ipv4_of "$host")"
  if [ -z "$have" ] || [ "$have" != "$want" ]; then
    printf '\n\033[1;33m%s\033[0m\n' "Домен $host ещё не указывает на этот сервер (сейчас: ${have:-записи нет})."
    echo "Добавьте в DNS у регистратора запись:"
    echo "    Тип: A     Имя: ${host%%."$DOMAIN"}     Значение: ${want:-IP сервера}"
    echo "Подождите 10–30 минут, проверьте командой:  getent hosts $host"
    echo "и запустите этот скрипт снова. На сервере пока ничего не изменено."
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
  if certbot certonly --webroot -w "$ACME_ROOT" -n --agree-tos --register-unsafely-without-email \
       --keep-until-expiring -d "$host"; then
    rm -f /etc/nginx/sites-enabled/zz-acme-temp; systemctl reload nginx
    ok "Сертификат для $host получен"
  else
    rm -f /etc/nginx/sites-enabled/zz-acme-temp; systemctl reload nginx
    fail "Не удалось получить сертификат для $host (см. текст выше)"
  fi
}

PROXY_HEADERS="proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;"

say "1/5 Сертификаты HTTPS"
ensure_cert "$DOMAIN"
ensure_cert "$VPN_HOST"

say "2/5 Скачиваю VPN Python"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$VPN_REF" -o "$TMP/vpn.tgz"
tar -xzf "$TMP/vpn.tgz" -C "$TMP"
TOP="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d -name 'chess-sitw-*' | head -1)"
SRC="$TOP/vpn-python"
[ -n "$TOP" ] && [ -f "$SRC/app.py" ] || fail "В архиве нет vpn-python/app.py — проверьте BRANCH"
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

say "3/5 Пароль админки и автозапуск"
if run_app has-password; then
  ok "Пароль уже задан (сменить: bash vpn-python.sh --password)"
else
  ask_password
fi
# «Адрес сайта» нужен для входа через Google — это адрес публичной части VPN Python
runuser -u "$VPN_USER" -- "$VPN_DIR/venv/bin/python" - "$VPN_DIR/data/site.db" "https://$VPN_HOST" <<'PY'
import sqlite3, sys
con = sqlite3.connect(sys.argv[1])
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

say "4/5 Маркетплейс на https://$DOMAIN + админка VPN Python на /admin"
mkdir -p "$(dirname "$SNIPPET")"
cat > "$SNIPPET" <<EOF
# Админка VPN Python внутри сайта маркетплейса (создано vpn-python.sh)
location /admin {
    client_max_body_size 520m;
    client_body_timeout 600s;
    proxy_pass http://127.0.0.1:$VPN_PORT;
    $PROXY_HEADERS
    # кнопка «Открыть сайт» в админке ведёт на сайт VPN Python, а не на маркетплейс
    proxy_set_header Accept-Encoding "";
    sub_filter 'href="/" target="_blank"' 'href="https://$VPN_HOST/" target="_blank"';
    sub_filter_once on;
}
location /static/ {
    proxy_pass http://127.0.0.1:$VPN_PORT;
    $PROXY_HEADERS
}
location /media/ {
    proxy_pass http://127.0.0.1:$VPN_PORT;
    $PROXY_HEADERS
}
location /api/files/ {
    proxy_pass http://127.0.0.1:$VPN_PORT;
    $PROXY_HEADERS
}
EOF
curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/marketplace/deploy/install.sh" -o "$TMP/market-install.sh"
grep -q 'systemmarket-\*\.conf' "$TMP/market-install.sh" || fail "Старая версия установщика маркетплейса — проверьте BRANCH"
DOMAIN="$DOMAIN" BRANCH="$BRANCH" bash "$TMP/market-install.sh"
ok "Маркетплейс работает на $DOMAIN, админка VPN Python — на $DOMAIN/admin"

say "5/5 nginx: $VPN_HOST → VPN Python"
cat > "$SITE.new" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $VPN_HOST;
    location /.well-known/acme-challenge/ { root $ACME_ROOT; }
    location / { return 301 https://\$host\$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $VPN_HOST;
    ssl_certificate /etc/letsencrypt/live/$VPN_HOST/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$VPN_HOST/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # админка живёт на главном домене
    location /admin { return 302 https://$DOMAIN\$request_uri; }

    location / {
        proxy_pass http://127.0.0.1:$VPN_PORT;
        $PROXY_HEADERS
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
[ -n "$OLD" ] && rm -f "$OLD"

sleep 1
check() {
  local code
  code="$(curl -sk -o /dev/null -w '%{http_code}' --resolve "$1:443:127.0.0.1" "https://$1$2" || true)"
  if [ "$code" = "$3" ]; then ok "https://$1$2 — работает"; else echo "!! https://$1$2 — ответ $code (ожидался $3)"; fi
}
check "$DOMAIN" "/" 200
check "$DOMAIN" "/api/health" 200
check "$DOMAIN" "/admin" 200
check "$VPN_HOST" "/" 200

printf '\n\033[1;32m════════════════════════════════════════════════\033[0m\n'
printf '  Маркетплейс:          \033[1mhttps://%s/\033[0m\n' "$DOMAIN"
printf '  Админка VPN Python:   \033[1mhttps://%s/admin\033[0m\n' "$DOMAIN"
printf '  Сайт VPN Python:      \033[1mhttps://%s/\033[0m\n' "$VPN_HOST"
printf '\033[1;32m════════════════════════════════════════════════\033[0m\n'
echo "Логи VPN Python:  journalctl -u vpn-python -f"
