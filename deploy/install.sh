#!/usr/bin/env bash
# Установка / обновление сайта VPN Python на сервер Ubuntu/Debian.
#
#   bash deploy/install.sh                        — установить или обновить
#   bash deploy/install.sh --password             — сменить пароль админки
#   bash deploy/install.sh --reset-2fa            — отключить 2FA (если потерян телефон)
#   bash deploy/install.sh --unblock-all          — снять все блокировки IP
#   bash deploy/install.sh --cloudflare-firewall  — пускать на сайт только Cloudflare
#   bash deploy/install.sh --cloudflare-firewall-off
#   PORT=8080 bash deploy/install.sh              — другой порт (по умолчанию 80)
#
# Данные сайта (файлы, APK, фото, пароль) лежат в /opt/vpn-python/data
# и при обновлении не удаляются.
set -euo pipefail

APP_NAME="vpn-python"
APP_DIR="/opt/vpn-python"
APP_USER="vpnpy"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE="/etc/systemd/system/${APP_NAME}.service"
# порт: из переменной PORT, иначе тот, что уже настроен в службе, иначе 80
PORT="${PORT:-$(sed -n 's/.*--bind 0\.0\.0\.0:\([0-9]*\).*/\1/p' "$SERVICE" 2>/dev/null || true)}"
PORT="${PORT:-80}"

say()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31m✘ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || fail "Запустите от root: bash deploy/install.sh (или через sudo)"
[ -f "$SRC_DIR/app.py" ] || fail "Не найден app.py рядом со скриптом ($SRC_DIR)"

ask_password() {
  local p1 p2
  while true; do
    read -r -s -p "Придумайте пароль для админки (мин. 8 символов): " p1 </dev/tty; echo
    read -r -s -p "Повторите пароль: " p2 </dev/tty; echo
    if [ "${#p1}" -lt 8 ]; then echo "Слишком короткий, ещё раз."; continue; fi
    if [ "$p1" != "$p2" ]; then echo "Пароли не совпадают, ещё раз."; continue; fi
    break
  done
  printf '%s\n' "$p1" | runuser -u "$APP_USER" -- env DATA_DIR="$APP_DIR/data" \
    "$APP_DIR/venv/bin/python" "$APP_DIR/app.py" set-password --stdin
}

run_app() {
  runuser -u "$APP_USER" -- env DATA_DIR="$APP_DIR/data" "$APP_DIR/venv/bin/python" "$APP_DIR/app.py" "$@"
}
need_installed() {
  [ -x "$APP_DIR/venv/bin/python" ] || fail "Сайт ещё не установлен. Сначала: bash deploy/install.sh"
}

# Официальные адреса Cloudflare: https://www.cloudflare.com/ips/
CF_RANGES="173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18
108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15
104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22 2400:cb00::/32 2606:4700::/32 2803:f800::/32
2405:b500::/32 2405:8100::/32 2a06:98c0::/29 2c0f:f248::/32"

ssh_port() {
  local p
  p="$(ss -ltnpH 2>/dev/null | awk '/sshd/ {split($4,a,":"); print a[length(a)]; exit}')"
  echo "${p:-22}"
}

cloudflare_firewall_on() {
  command -v ufw >/dev/null 2>&1 || apt-get install -y -qq ufw >/dev/null
  local sp; sp="$(ssh_port)"
  echo "SSH-порт: $sp — он останется открытым."
  read -r -p "Сайт будет доступен ТОЛЬКО через Cloudflare (по домену). Продолжить? [y/N] " ans </dev/tty
  [ "$ans" = "y" ] || [ "$ans" = "Y" ] || fail "Отменено"
  ufw allow "$sp/tcp" >/dev/null
  ufw default deny incoming >/dev/null
  ufw default allow outgoing >/dev/null
  ufw delete allow "$PORT/tcp" >/dev/null 2>&1 || true
  for net in $CF_RANGES; do
    ufw allow proto tcp from "$net" to any port "$PORT" comment "cloudflare" >/dev/null
  done
  ufw --force enable >/dev/null
  ok "Фаервол включён: порт $PORT открыт только для Cloudflare, SSH ($sp) открыт"
}

cloudflare_firewall_off() {
  command -v ufw >/dev/null 2>&1 || fail "ufw не установлен — фаервол и так выключен"
  for net in $CF_RANGES; do
    ufw delete allow proto tcp from "$net" to any port "$PORT" >/dev/null 2>&1 || true
  done
  ufw allow "$PORT/tcp" >/dev/null
  ok "Порт $PORT снова открыт для всех"
}

case "${1:-}" in
  --password) need_installed; ask_password; systemctl restart "$APP_NAME" 2>/dev/null || true; ok "Пароль изменён"; exit 0 ;;
  --reset-2fa) need_installed; run_app reset-2fa; exit 0 ;;
  --unblock-all) need_installed; run_app unblock-all; systemctl restart "$APP_NAME" 2>/dev/null || true; exit 0 ;;
  --cloudflare-firewall) cloudflare_firewall_on; exit 0 ;;
  --cloudflare-firewall-off) cloudflare_firewall_off; exit 0 ;;
  "") ;;
  *) fail "Неизвестный параметр: $1" ;;
esac

say "1/6 Устанавливаю пакеты (python3, venv)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip ca-certificates >/dev/null
ok "Пакеты готовы"

say "2/6 Копирую файлы сайта в $APP_DIR…"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR/data"
if [ "$SRC_DIR" != "$APP_DIR" ]; then
  rm -rf "$APP_DIR/templates" "$APP_DIR/static"
  cp -r "$SRC_DIR"/*.py "$SRC_DIR/requirements.txt" "$SRC_DIR/templates" "$SRC_DIR/static" "$APP_DIR/"
fi
chown -R root:root "$APP_DIR/templates" "$APP_DIR/static" "$APP_DIR"/*.py "$APP_DIR/requirements.txt"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/data"
chmod 750 "$APP_DIR/data"
ok "Файлы скопированы"

say "3/6 Устанавливаю Flask и Gunicorn…"
[ -x "$APP_DIR/venv/bin/python" ] || python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install -q --upgrade pip
"$APP_DIR/venv/bin/pip" install -q -r "$APP_DIR/requirements.txt"
ok "Зависимости установлены"

say "4/6 Пароль админки…"
if run_app has-password; then
  ok "Пароль уже задан (сменить: bash deploy/install.sh --password)"
else
  ask_password
fi

say "5/6 Настраиваю автозапуск (systemd) на порту $PORT…"
if ss -ltnH "sport = :$PORT" 2>/dev/null | grep -q . && ! systemctl is-active --quiet "$APP_NAME"; then
  ss -ltnp "sport = :$PORT" || true
  fail "Порт $PORT уже занят другой программой. Запустите так: PORT=8080 sudo -E bash deploy/install.sh"
fi
cat > "$SERVICE" <<EOF
[Unit]
Description=VPN Python website
After=network.target

[Service]
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment=DATA_DIR=$APP_DIR/data
ExecStart=$APP_DIR/venv/bin/gunicorn --preload --workers 2 --worker-class gthread --threads 8 --timeout 600 --bind 0.0.0.0:$PORT app:app
Restart=always
RestartSec=3
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --quiet "$APP_NAME"
systemctl restart "$APP_NAME"
ok "Служба $APP_NAME запущена"

say "6/6 Проверяю…"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  if ufw status 2>/dev/null | grep -q "cloudflare"; then
    ok "Фаервол: порт $PORT открыт только для Cloudflare"
  else
    ufw allow "$PORT/tcp" >/dev/null && ok "Порт $PORT открыт в ufw"
  fi
fi
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if python3 -c "import urllib.request,sys; urllib.request.urlopen('http://127.0.0.1:$PORT/', timeout=3)" 2>/dev/null; then
    break
  fi
  sleep 1
done
systemctl is-active --quiet "$APP_NAME" || { journalctl -u "$APP_NAME" -n 30 --no-pager; fail "Сайт не запустился"; }

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
SUFFIX=""; [ "$PORT" = "80" ] || SUFFIX=":$PORT"
printf '\n\033[1;32m════════════════════════════════════════════\033[0m\n'
printf '  Сайт:    \033[1mhttp://%s%s/\033[0m\n' "${IP:-ВАШ_IP}" "$SUFFIX"
printf '  Админка: \033[1mhttp://%s%s/admin\033[0m\n' "${IP:-ВАШ_IP}" "$SUFFIX"
printf '\033[1;32m════════════════════════════════════════════\033[0m\n'
echo "Логи:        journalctl -u $APP_NAME -f"
echo "Защита:      Cloudflare + фаервол — см. README (bash deploy/install.sh --cloudflare-firewall)"
echo "Перезапуск:  systemctl restart $APP_NAME"
