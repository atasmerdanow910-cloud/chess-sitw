#!/usr/bin/env bash
# Установка / обновление SystemMarket на Ubuntu (nginx + gunicorn + SQLite).
# Запуск от root:
#   curl -fsSL https://raw.githubusercontent.com/atasmerdanow910-cloud/chess-sitw/ccr-d10ab0ac-yrj6qu/marketplace/deploy/install.sh | DOMAIN=systemmarket.duckdns.org bash
# Повторный запуск безопасен: обновит код, данные и фото не трогает.
set -euo pipefail

DOMAIN="${DOMAIN:-systemmarket.duckdns.org}"
BRANCH="${BRANCH:-ccr-d10ab0ac-yrj6qu}"
RAW="https://raw.githubusercontent.com/atasmerdanow910-cloud/chess-sitw/${BRANCH}/marketplace"
APP=/opt/systemmarket
DATA=/var/lib/systemmarket
WEB=/var/www/systemmarket
ENVF=/etc/systemmarket.env
SITE=/etc/nginx/sites-available/systemmarket

[ "$(id -u)" -eq 0 ] || { echo "Запустите от root"; exit 1; }
echo "==> Домен: $DOMAIN"

echo "==> Пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3-venv nginx curl >/dev/null

echo "==> Пользователь и папки"
id -u systemmarket >/dev/null 2>&1 || useradd --system --home "$DATA" --shell /usr/sbin/nologin systemmarket
mkdir -p "$APP" "$DATA/uploads" "$WEB"
chown -R systemmarket:systemmarket "$DATA"
chmod 755 "$DATA" "$DATA/uploads"

SCHEME=https
[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] || SCHEME=http
SITE_URL="$SCHEME://$DOMAIN"

echo "==> Скачиваю код"
TMP=$(mktemp -d)
curl -fsSL "$RAW/server/app.py" -o "$TMP/app.py"
curl -fsSL "$RAW/server/requirements.txt" -o "$TMP/requirements.txt"
curl -fsSL "$RAW/index.html" -o "$TMP/index.html"
install -m 644 "$TMP/app.py" "$APP/app.py"
install -m 644 "$TMP/requirements.txt" "$APP/requirements.txt"
sed "s#__SITE_URL__#$SITE_URL#g" "$TMP/index.html" > "$TMP/index.out"
install -m 644 "$TMP/index.out" "$WEB/index.html"
for f in favicon.svg favicon-48.png favicon-192.png favicon-512.png maskable-512.png apple-touch-icon.png og.jpg site.webmanifest; do
  curl -fsSL "$RAW/static/$f" -o "$TMP/$f"
  install -m 644 "$TMP/$f" "$WEB/$f"
done
rm -rf "$TMP"

echo "==> robots.txt и sitemap.xml для Google"
cat > "$WEB/robots.txt" <<EOF
User-agent: *
Allow: /

Sitemap: $SITE_URL/sitemap.xml
EOF
cat > "$WEB/sitemap.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>$SITE_URL/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>
</urlset>
EOF
chmod 644 "$WEB/robots.txt" "$WEB/sitemap.xml"

echo "==> Python-окружение (1–3 минуты)"
[ -x "$APP/venv/bin/python" ] || python3 -m venv "$APP/venv"
"$APP/venv/bin/pip" install -q --upgrade pip
"$APP/venv/bin/pip" install -q -r "$APP/requirements.txt"

if [ ! -f "$ENVF" ]; then
  echo "==> Создаю ключ администратора"
  printf 'SM_DATA=%s\nSM_ADMIN_TOKEN=%s\n' "$DATA" "$(python3 -c 'import secrets;print(secrets.token_urlsafe(18))')" > "$ENVF"
  chmod 640 "$ENVF"; chown root:systemmarket "$ENVF"
fi

echo "==> Служба systemd"
cat > /etc/systemd/system/systemmarket.service <<EOF
[Unit]
Description=SystemMarket API
After=network.target

[Service]
User=systemmarket
Group=systemmarket
WorkingDirectory=$APP
EnvironmentFile=$ENVF
ExecStart=$APP/venv/bin/gunicorn --workers 2 --bind 127.0.0.1:8000 --timeout 90 app:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now systemmarket >/dev/null 2>&1
systemctl restart systemmarket

echo "==> nginx"
CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
APPBLOCK=$(cat <<EOF
    client_max_body_size 40m;
    root $WEB;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90s;
        proxy_request_buffering on;
    }
    location /uploads/ {
        alias $DATA/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
        try_files \$uri =404;
    }
    location = /index.html { add_header Cache-Control "no-cache"; }
    location = /site.webmanifest { default_type application/manifest+json; }
    location / { try_files \$uri /index.html; }
EOF
)
if [ -f "$CERT" ]; then
  cat > "$SITE.new" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN www.$DOMAIN;
    ssl_certificate $CERT;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
$APPBLOCK
}
EOF
else
  echo "   (сертификата для $DOMAIN нет — пока только http)"
  cat > "$SITE.new" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN _;
$APPBLOCK
}
EOF
fi

BACKUP=$(mktemp -d)
cp -a /etc/nginx/sites-enabled/. "$BACKUP/" 2>/dev/null || true
[ -f "$SITE" ] && cp -a "$SITE" "$BACKUP/systemmarket.available" || true
mv "$SITE.new" "$SITE"
ln -sf "$SITE" /etc/nginx/sites-enabled/systemmarket
rm -f /etc/nginx/sites-enabled/default
if nginx -t 2>/dev/null; then
  systemctl reload nginx
else
  echo "!! Ошибка в настройке nginx — возвращаю как было"
  nginx -t || true
  rm -f /etc/nginx/sites-enabled/systemmarket
  cp -a "$BACKUP/." /etc/nginx/sites-enabled/ 2>/dev/null || true
  rm -f /etc/nginx/sites-enabled/systemmarket.available
  [ -f "$BACKUP/systemmarket.available" ] && cp -a "$BACKUP/systemmarket.available" "$SITE" || true
  systemctl reload nginx || true
  exit 1
fi

echo "==> Проверка"
sleep 2
if curl -fsS http://127.0.0.1:8000/api/health >/dev/null; then
  echo "   API работает"
else
  echo "!! API не отвечает. Лог: journalctl -u systemmarket -n 50 --no-pager"
  exit 1
fi

echo
echo "Готово! Откройте: https://$DOMAIN"
echo "Ключ администратора (сохраните, никому не показывайте):"
grep SM_ADMIN_TOKEN "$ENVF" | cut -d= -f2
