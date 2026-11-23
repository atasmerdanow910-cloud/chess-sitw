#!/usr/bin/env python3
"""VPN Python — сайт: Pydroid 3 (APK), фото-инструкция, готовые .py файлы,
вход через Google и админ-панель с паролем и 2FA.

Запуск для разработки:   python3 app.py               (http://localhost:8000)
Задать пароль админки:    python3 app.py set-password
Сбросить 2FA админки:     python3 app.py reset-2fa
"""
import hmac
import io
import os
import re
import secrets
import sqlite3
import sys
import time
from datetime import timedelta
from functools import wraps
from urllib.parse import quote, urlparse

from flask import (
    Flask,
    Response,
    abort,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    send_from_directory,
    session,
)
from flask.sessions import SecureCookieSessionInterface
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.security import check_password_hash, generate_password_hash

import oauth
import security as sec

# ----------------------------------------------------------------- настройки --

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.environ.get("DATA_DIR", os.path.join(BASE_DIR, "data")))
DB_PATH = os.path.join(DATA_DIR, "site.db")
APK_DIR = os.path.join(DATA_DIR, "apk")
APK_PATH = os.path.join(APK_DIR, "app.apk")
MEDIA_DIR = os.path.join(DATA_DIR, "media")

MAX_PY_BYTES = 1 * 1024 * 1024        # .py файл — до 1 МБ
MAX_IMG_BYTES = 15 * 1024 * 1024      # фото инструкции — до 15 МБ
MAX_APK_BYTES = 500 * 1024 * 1024     # APK — до 500 МБ
MAX_STEP_PHOTOS = 6                   # фото на один шаг инструкции
MAX_PUBLIC_BODY = 64 * 1024           # тело запроса вне админки

# Защита от флуда (на один IP)
RATE_GENERAL = (240, 60)              # 240 запросов в минуту
RATE_DOWNLOAD = (40, 600)             # 40 скачиваний за 10 минут
RATE_AUTH = (20, 600)                 # 20 попыток входа через Google за 10 минут
FLOOD_BAN_FACTOR = 3                  # превысил лимит в 3 раза — автоблок
AUTO_BAN_MINUTES = 15
LOGIN_MAX_FAILS = 5                   # неверных паролей / кодов 2FA
LOGIN_LOCK_SECONDS = 10 * 60
TWOFA_TTL = 5 * 60

PUBLIC_SETTINGS = ("site_title", "site_subtitle", "play_url", "contact_url")

DEFAULT_SETTINGS = {
    "site_title": "VPN Python",
    "site_subtitle": (
        "Запускайте Python-скрипты прямо на Android. Установите Pydroid 3 по пошаговой "
        "инструкции и используйте готовые .py файлы."
    ),
    "site_url": "",
    "play_url": "https://play.google.com/store/apps/details?id=ru.iiec.pydroid3",
    "contact_url": "",
    "apk_name": "",
    "apk_size": "0",
    "apk_version": "",
    "apk_updated": "0",
    "apk_downloads": "0",
    "admin_password_hash": "",
    "session_ver": "",
    "admin_totp_secret": "",
    "admin_totp_last": "0",
    "google_client_id": "",
    "google_client_secret": "",
    "require_login_files": "0",
    "require_login_apk": "0",
    "cf_only": "0",
}

STEPS = [
    {
        "key": "download",
        "title": "Скачайте Pydroid 3",
        "text": "Нажмите кнопку «Скачать Pydroid 3» в начале страницы. Если браузер "
                "спросит подтверждение — нажмите «Скачать».",
        "tips": ["Файл сохранится в папку «Загрузки» (Download)."],
    },
    {
        "key": "unknown",
        "title": "Разрешите установку",
        "text": "Откройте скачанный файл. Android покажет «Установка заблокирована» — "
                "нажмите «Настройки» и включите «Разрешить из этого источника».",
        "tips": ["Разрешение выдаётся один раз для вашего браузера."],
    },
    {
        "key": "install",
        "title": "Установите приложение",
        "text": "Вернитесь назад и нажмите «Установить». Установка займёт несколько секунд.",
        "tips": ["Если появится Play Защита — нажмите «Подробнее» → «Всё равно установить»."],
    },
    {
        "key": "open",
        "title": "Откройте Pydroid 3",
        "text": "Найдите Pydroid 3 на рабочем столе или в списке приложений. При первом "
                "запуске приложение подготовит Python — дождитесь окончания.",
        "tips": ["Для первого запуска нужно подключение к интернету."],
    },
    {
        "key": "storage",
        "title": "Дайте доступ к хранилищу",
        "text": "Когда появится запрос доступа к файлам — нажмите «Разрешить». Без этого "
                "Pydroid 3 не увидит скачанные .py файлы.",
        "tips": [
            "Запроса не было: Настройки → Приложения → Pydroid 3 → Разрешения → "
            "Файлы и медиа → Разрешить.",
            "Android 11 и новее: Настройки → Приложения → Специальный доступ → "
            "Доступ ко всем файлам → Pydroid 3 → Вкл.",
        ],
    },
    {
        "key": "file",
        "title": "Откройте .py файл",
        "text": "Скачайте нужный файл в разделе «Файлы». В Pydroid 3 нажмите значок папки "
                "вверху → «Open» → «Internal storage» → «Download» и выберите файл.",
        "tips": ["Альтернатива: нажмите «Копировать» у файла и вставьте код в редактор "
                 "Pydroid (долгое нажатие → «Вставить»)."],
    },
    {
        "key": "run",
        "title": "Запустите код",
        "text": "Нажмите жёлтую кнопку ▶ в правом нижнем углу. Откроется терминал "
                "с результатом работы программы.",
        "tips": ["Ошибка ModuleNotFoundError: меню ☰ → «Pip» → введите название "
                 "библиотеки → «Install»."],
    },
]
STEP_KEYS = {s["key"] for s in STEPS}

SCHEMA = """
CREATE TABLE IF NOT EXISTS files (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    filename     TEXT NOT NULL,
    code         TEXT NOT NULL,
    requirements TEXT NOT NULL DEFAULT '',
    size         INTEGER NOT NULL DEFAULT 0,
    lines        INTEGER NOT NULL DEFAULT 0,
    downloads    INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_fail (
    ip    TEXT PRIMARY KEY,
    fails INTEGER NOT NULL,
    last  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    google_sub TEXT NOT NULL UNIQUE,
    email      TEXT NOT NULL,
    name       TEXT NOT NULL,
    picture    TEXT NOT NULL DEFAULT '',
    blocked    INTEGER NOT NULL DEFAULT 0,
    logins     INTEGER NOT NULL DEFAULT 0,
    downloads  INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_login INTEGER NOT NULL,
    last_ip    TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS ip_blocks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    net        TEXT NOT NULL UNIQUE,
    reason     TEXT NOT NULL DEFAULT '',
    until      INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS security_log (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    ts     INTEGER NOT NULL,
    ip     TEXT NOT NULL DEFAULT '',
    event  TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT ''
);
"""

FILE_COLUMNS = ("id, title, description, filename, requirements, size, lines, "
                "downloads, created_at, updated_at")


# ------------------------------------------------------------ база и данные --

def ensure_dirs():
    for d in (DATA_DIR, APK_DIR, MEDIA_DIR):
        os.makedirs(d, exist_ok=True)


def connect():
    con = sqlite3.connect(DB_PATH, timeout=15)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    ensure_dirs()
    con = connect()
    try:
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript(SCHEMA)
        for key, value in DEFAULT_SETTINGS.items():
            con.execute("INSERT OR IGNORE INTO settings(key, value) VALUES(?, ?)", (key, value))
        con.commit()
    finally:
        con.close()


def load_secret_key():
    """Секретный ключ сессий: создаётся один раз и хранится в data/secret.key."""
    path = os.path.join(DATA_DIR, "secret.key")
    if not os.path.exists(path):
        tmp = "%s.%d.tmp" % (path, os.getpid())
        with open(tmp, "w") as f:
            f.write(secrets.token_hex(32))
        os.chmod(tmp, 0o600)
        try:
            os.link(tmp, path)          # атомарно: не перезапишет уже созданный ключ
        except FileExistsError:
            pass
        finally:
            os.unlink(tmp)
    with open(path) as f:
        return f.read().strip()


def db():
    if "db" not in g:
        g.db = connect()
    return g.db


def get_settings(con=None):
    con = con or db()
    data = dict(DEFAULT_SETTINGS)
    data.update({r["key"]: r["value"] for r in con.execute("SELECT key, value FROM settings")})
    return data


def set_setting(con, key, value):
    con.execute(
        "INSERT INTO settings(key, value) VALUES(?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, str(value)),
    )


def now():
    return int(time.time())


def to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def google_enabled(s):
    return bool(s.get("google_client_id") and s.get("google_client_secret"))


def parse_requirements(text):
    tokens = re.split(r"[\s,;]+", (text or "").strip())
    out = []
    for tok in tokens:
        if tok and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._\-\[\]=<>~!]{0,80}", tok) and tok not in out:
            out.append(tok)
    return out[:20]


def file_meta(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "filename": row["filename"],
        "requirements": parse_requirements(row["requirements"]),
        "size": row["size"],
        "lines": row["lines"],
        "downloads": row["downloads"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "download_url": "/dl/%s/%s" % (row["id"], quote(row["filename"])),
    }


def apk_info(s):
    available = os.path.isfile(APK_PATH)
    return {
        "available": available,
        "url": "/download/apk" if available else s["play_url"],
        "name": s["apk_name"] or "pydroid3.apk",
        "size": to_int(s["apk_size"]) if available else 0,
        "version": s["apk_version"],
        "updated_at": to_int(s["apk_updated"]),
        "downloads": to_int(s["apk_downloads"]),
    }


def user_public(row):
    if row is None:
        return None
    return {"name": row["name"], "email": row["email"], "picture": row["picture"],
            "created_at": row["created_at"]}


def public_data():
    con = db()
    s = get_settings(con)
    files = [file_meta(r) for r in con.execute(
        "SELECT %s FROM files ORDER BY created_at DESC, rowid DESC" % FILE_COLUMNS)]
    apk = apk_info(s)
    steps = [dict(st, photos=["/media/" + n for n in step_photos(s, st["key"])]) for st in STEPS]
    user = current_user()
    gate = google_enabled(s)
    return {
        "site": {k: s.get(k, "") for k in PUBLIC_SETTINGS},
        "apk": apk,
        "steps": steps,
        "files": files,
        "stats": {
            "files": len(files),
            "file_downloads": sum(f["downloads"] for f in files),
            "apk_downloads": apk["downloads"],
        },
        "auth": {
            "google": gate,
            "user": user_public(user),
            "require_files": gate and s["require_login_files"] == "1",
            "require_apk": gate and s["require_login_apk"] == "1",
            "csrf": csrf_token() if user is not None else "",
        },
        "secure": {"https": is_https(), "cloudflare": via_cloudflare()},
    }


MEDIA_RE = re.compile(r"[a-z0-9_]+\.(jpg|png|webp)")


def step_photos(s, key):
    names = (s.get("step_photo_" + key) or "").split(",")
    return [n for n in names if MEDIA_RE.fullmatch(n)]


def log_event(event, detail="", ip=None):
    con = db()
    cur = con.execute("INSERT INTO security_log(ts, ip, event, detail) VALUES(?, ?, ?, ?)",
                      (now(), ip if ip is not None else client_ip(), event, str(detail)[:300]))
    if cur.lastrowid and cur.lastrowid % 200 == 0:
        con.execute("DELETE FROM security_log WHERE id <= ?", (cur.lastrowid - 3000,))
    con.commit()


# ------------------------------------------------------------- валидация --

def clean_filename(name, ext):
    """Безопасное имя файла с нужным расширением (кириллица разрешена)."""
    name = os.path.basename((name or "").strip().replace("\\", "/"))
    base, cur_ext = os.path.splitext(name)
    if cur_ext.lower() != ext:
        if cur_ext and ext == ".py":
            raise ValueError("Можно загружать только файлы .py")
        if cur_ext and ext == ".apk":
            raise ValueError("Нужен файл .apk")
        base = name
    base = re.sub(r"\s+", "_", base)
    base = re.sub(r"[^\w\-.]", "", base).strip("._-")[:80]
    return (base or "script") + ext


def title_from_filename(name):
    base = os.path.splitext(name)[0].replace("_", " ").replace("-", " ").strip()
    base = re.sub(r"\s+", " ", base)
    return (base[:1].upper() + base[1:]) if base else "Скрипт"


def decode_code(raw):
    for enc in ("utf-8-sig", "cp1251"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("Не удалось прочитать файл: сохраните его в кодировке UTF-8")
    if "\x00" in text:
        raise ValueError("Это не текстовый .py файл")
    return text.replace("\r\n", "\n").replace("\r", "\n")


def code_stats(code):
    size = len(code.encode("utf-8"))
    if size > MAX_PY_BYTES:
        raise ValueError("Код больше 1 МБ")
    lines = code.count("\n") + (0 if code.endswith("\n") or not code else 1)
    return size, lines


def image_ext(raw):
    if raw.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "webp"
    return None


def clean_text(value, limit):
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", str(value or "")).strip()[:limit]


def clean_url(value):
    value = clean_text(value, 300)
    if value and not re.match(r"^https?://[^\s<>\"']+$", value, re.I):
        raise ValueError("Ссылка должна начинаться с http:// или https://")
    return value


def clean_site_url(value):
    value = clean_text(value, 200).rstrip("/")
    if not value:
        return ""
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.path not in ("", "/") \
            or parsed.query or parsed.fragment:
        raise ValueError("Адрес сайта — только домен, например https://example.com")
    return "%s://%s" % (parsed.scheme, parsed.netloc)


def safe_next(value):
    value = (value or "").strip()
    if not value.startswith("/") or value.startswith("//") or "\\" in value or len(value) > 200:
        return "/"
    return value


def bad(message, status=400, **extra):
    return jsonify(ok=False, error=message, **extra), status


# --------------------------------------------------------------- приложение --

init_db()
app = Flask(__name__)


class AdaptiveSessionInterface(SecureCookieSessionInterface):
    """Флаг Secure у cookie ставится, когда сайт открыт по HTTPS (в т.ч. через Cloudflare)."""

    def get_cookie_secure(self, app_):
        try:
            return is_https()
        except RuntimeError:
            return False


app.session_interface = AdaptiveSessionInterface()
app.config.update(
    SECRET_KEY=load_secret_key(),
    MAX_CONTENT_LENGTH=MAX_APK_BYTES + 2 * 1024 * 1024,
    MAX_FORM_MEMORY_SIZE=4 * 1024 * 1024,
    SESSION_COOKIE_NAME="vp_session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=timedelta(days=14),
)
app.json.ensure_ascii = False


def asset_version():
    latest = 0
    for root, _dirs, names in os.walk(os.path.join(BASE_DIR, "static")):
        for n in names:
            latest = max(latest, int(os.path.getmtime(os.path.join(root, n))))
    return str(latest)


ASSET_VERSION = asset_version()

CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com data:; "
    "img-src 'self' data: blob: https://*.googleusercontent.com; "
    "connect-src 'self'; "
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
)


# ------------------------------------------------------- IP, HTTPS, защита --

def client_ip():
    """Настоящий IP посетителя. Заголовкам Cloudflare верим, только если запрос
    пришёл с серверов Cloudflare — подделать IP напрямую нельзя."""
    if "ip" in g:
        return g.ip
    remote = request.remote_addr or ""
    candidate = remote
    if sec.is_cloudflare(remote):
        candidate = request.headers.get("CF-Connecting-IP", remote)
    elif sec.is_loopback(remote):
        candidate = request.headers.get("X-Real-IP") or remote
    parsed = sec.parse_ip(candidate)
    g.ip = str(parsed) if parsed else remote
    return g.ip


def via_cloudflare():
    return sec.is_cloudflare(request.remote_addr)


def is_https():
    if request.scheme == "https":
        return True
    remote = request.remote_addr
    if sec.is_cloudflare(remote) or sec.is_loopback(remote):
        return request.headers.get("X-Forwarded-Proto", "").lower() == "https"
    return False


def _load_blocks():
    con = connect()
    try:
        rows = con.execute("SELECT net FROM ip_blocks WHERE until = 0 OR until > ?", (now(),)).fetchall()
    finally:
        con.close()
    return [n for n in (sec.parse_network(r["net"]) for r in rows) if n is not None]


def _load_guard_settings():
    con = connect()
    try:
        s = get_settings(con)
    finally:
        con.close()
    return {"cf_only": s["cf_only"] == "1"}


limiter = sec.RateLimiter()
blocks_cache = sec.TTLCache(5, _load_blocks)
guard_cache = sec.TTLCache(5, _load_guard_settings)


def ip_blocked(ip_str):
    ip = sec.parse_ip(ip_str)
    return ip is not None and any(ip.version == n.version and ip in n for n in blocks_cache.get())


def block_ip(con, net, reason, minutes):
    until = now() + minutes * 60 if minutes > 0 else 0
    con.execute(
        "INSERT INTO ip_blocks(net, reason, until, created_at) VALUES(?, ?, ?, ?) "
        "ON CONFLICT(net) DO UPDATE SET reason = excluded.reason, until = excluded.until, "
        "created_at = excluded.created_at",
        (net, reason, until, now()))
    con.commit()
    blocks_cache.reset()


GUARD_PAGE = (
    "<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
    "<title>%s</title><body style='margin:0;min-height:100vh;display:grid;place-items:center;"
    "background:#07090f;color:#e8ecf4;font:16px system-ui,sans-serif;text-align:center;padding:24px'>"
    "<div><div style='font-size:44px;font-weight:700;color:#4f8cff'>%d</div><p>%s</p></div>"
)


def guard_response(status, text, retry_after=None):
    if request.path.startswith(("/api/", "/admin/api/")):
        resp = jsonify(ok=False, error=text)
        resp.status_code = status
    else:
        resp = Response(GUARD_PAGE % (text, status, text), status, mimetype="text/html")
    if retry_after:
        resp.headers["Retry-After"] = str(retry_after)
    return resp


@app.before_request
def guard():
    remote = request.remote_addr or ""
    ip = client_ip()
    if guard_cache.get()["cf_only"] and not sec.is_cloudflare(remote) and not sec.is_loopback(remote):
        return guard_response(403, "Доступ к серверу разрешён только через адрес сайта.")
    if ip_blocked(ip):
        return guard_response(403, "Доступ с вашего IP-адреса заблокирован.")
    path = request.path
    if (request.content_length or 0) > MAX_PUBLIC_BODY and not path.startswith("/admin/api/"):
        return guard_response(413, "Слишком большой запрос.")
    limit, window = RATE_GENERAL
    allowed, count = limiter.hit("g:" + ip, limit, window)
    if not allowed:
        if count == limit * FLOOD_BAN_FACTOR and not sec.is_loopback(ip):
            block_ip(db(), ip, "Автоблок: флуд запросами", AUTO_BAN_MINUTES)
            log_event("auto_ban", "Более %d запросов в минуту" % count, ip)
        return guard_response(429, "Слишком много запросов. Подождите минуту.", window)
    if path.startswith("/dl/") or path == "/download/apk":
        if not limiter.hit("d:" + ip, *RATE_DOWNLOAD)[0]:
            return guard_response(429, "Слишком много скачиваний. Попробуйте позже.", RATE_DOWNLOAD[1])
    if path.startswith("/auth/"):
        if not limiter.hit("a:" + ip, *RATE_AUTH)[0]:
            return guard_response(429, "Слишком много попыток входа. Попробуйте позже.", RATE_AUTH[1])
    return None


@app.after_request
def security_headers(resp):
    h = resp.headers
    h.setdefault("Content-Security-Policy", CSP)
    h.setdefault("X-Content-Type-Options", "nosniff")
    h.setdefault("X-Frame-Options", "DENY")
    h.setdefault("Referrer-Policy", "same-origin")
    h.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
    h.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    h.setdefault("Cross-Origin-Resource-Policy", "same-origin")
    if is_https():
        h.setdefault("Strict-Transport-Security", "max-age=15552000")
    if request.path.startswith(("/admin", "/auth", "/api/")):
        h["Cache-Control"] = "no-store"
    if request.path.startswith("/admin"):
        h["X-Robots-Tag"] = "noindex, nofollow"
    return resp


@app.teardown_appcontext
def close_db(_exc):
    con = g.pop("db", None)
    if con is not None:
        con.close()


@app.errorhandler(RequestEntityTooLarge)
def too_large(_e):
    return bad("Файл слишком большой", 413)


@app.context_processor
def inject_globals():
    return {"asset_v": ASSET_VERSION}


def message_page(title, text, status=200, icon="alert"):
    return render_template("message.html", title=title, text=text, icon=icon,
                           site=get_settings()), status


# --------------------------------------------------------------- сессии --

def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_hex(16)
    return session["csrf"]


def csrf_ok(token):
    expected = session.get("csrf", "")
    return bool(expected) and hmac.compare_digest(
        (token or "").encode("utf-8"), expected.encode("utf-8"))


def current_user():
    if "user" in g:
        return g.user
    g.user = None
    uid = session.get("uid")
    if uid:
        row = db().execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
        if row is None or row["blocked"]:
            session.pop("uid", None)
        else:
            g.user = row
    return g.user


def is_admin():
    if session.get("admin") is not True:
        return False
    ver = get_settings().get("session_ver", "")
    return bool(ver) and hmac.compare_digest(session.get("ver", "").encode(), ver.encode())


def access_allowed(setting_key):
    s = get_settings()
    if not google_enabled(s) or s.get(setting_key) != "1":
        return True
    return current_user() is not None or is_admin()


# ---------------------------------------------------------- публичная часть --

@app.get("/")
def index():
    data = public_data()
    data["flash"] = session.pop("flash", "")
    return render_template("index.html", data=data, site=data["site"])


@app.get("/api/data")
def api_data():
    return jsonify(public_data())


def get_file_or_404(fid):
    if not re.fullmatch(r"[a-f0-9]{8,32}", fid or ""):
        abort(404)
    row = db().execute("SELECT * FROM files WHERE id = ?", (fid,)).fetchone()
    if row is None:
        abort(404)
    return row


@app.get("/api/files/<fid>")
def api_file(fid):
    row = get_file_or_404(fid)
    if not access_allowed("require_login_files"):
        return bad("Войдите через Google, чтобы открыть код", 401, login=True)
    data = file_meta(row)
    data["code"] = row["code"]
    return jsonify(data)


@app.get("/dl/<fid>/<path:_name>")
def download_py(fid, _name):
    row = get_file_or_404(fid)
    if not access_allowed("require_login_files"):
        return redirect("/auth/google?next=" + quote("/#files"))
    con = db()
    con.execute("UPDATE files SET downloads = downloads + 1 WHERE id = ?", (fid,))
    user = current_user()
    if user is not None:
        con.execute("UPDATE users SET downloads = downloads + 1 WHERE id = ?", (user["id"],))
    con.commit()
    return send_file(
        io.BytesIO(row["code"].encode("utf-8")),
        mimetype="application/octet-stream",
        as_attachment=True,
        download_name=row["filename"],
        max_age=0,
    )


@app.get("/download/apk")
def download_apk():
    s = get_settings()
    if not os.path.isfile(APK_PATH):
        return redirect(s["play_url"] or "/")
    if not access_allowed("require_login_apk"):
        return redirect("/auth/google?next=/")
    rng = request.headers.get("Range", "")
    if not rng or rng.replace(" ", "").startswith("bytes=0-"):
        con = db()
        con.execute(
            "UPDATE settings SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) "
            "WHERE key = 'apk_downloads'")
        user = current_user()
        if user is not None:
            con.execute("UPDATE users SET downloads = downloads + 1 WHERE id = ?", (user["id"],))
        con.commit()
    return send_file(
        APK_PATH,
        mimetype="application/vnd.android.package-archive",
        as_attachment=True,
        download_name=s["apk_name"] or "pydroid3.apk",
        conditional=True,
        max_age=0,
    )


@app.get("/media/<name>")
def media(name):
    if not re.fullmatch(r"[a-z0-9_]+\.(jpg|png|webp)", name):
        abort(404)
    return send_from_directory(MEDIA_DIR, name, max_age=30 * 86400)


# ------------------------------------------------------ вход через Google --

def public_base(s):
    base = (s.get("site_url") or "").rstrip("/")
    if base:
        return base
    return "%s://%s" % ("https" if is_https() else "http", request.host)


def google_redirect_uri(s):
    return public_base(s) + "/auth/google/callback"


@app.get("/auth/google")
def auth_google():
    s = get_settings()
    if not google_enabled(s):
        return message_page("Вход через Google не настроен",
                            "Администратор ещё не подключил вход через Google.", 404)
    url, pending = oauth.start(s["google_client_id"], google_redirect_uri(s))
    pending["next"] = safe_next(request.args.get("next"))
    session["oauth"] = pending
    return redirect(url)


@app.get("/auth/google/callback")
def auth_google_callback():
    s = get_settings()
    pending = session.pop("oauth", None)
    if not google_enabled(s):
        abort(404)
    if request.args.get("error"):
        return message_page("Вход отменён", "Вы отменили вход через Google.", 400, "x")
    state = request.args.get("state", "")
    code = request.args.get("code", "")
    if not pending or not code or not hmac.compare_digest(
            state.encode("utf-8"), str(pending.get("state", "")).encode("utf-8")):
        return message_page("Не удалось войти", "Ссылка входа устарела. Попробуйте ещё раз.", 400)
    try:
        info = oauth.finish(s["google_client_id"], s["google_client_secret"],
                            google_redirect_uri(s), code, pending)
    except oauth.OAuthError as e:
        log_event("google_error", str(e))
        return message_page("Не удалось войти", str(e), 400)

    con = db()
    ip = client_ip()
    ts = now()
    row = con.execute("SELECT id, blocked FROM users WHERE google_sub = ?", (info["sub"],)).fetchone()
    if row is not None and row["blocked"]:
        log_event("blocked_user_login", info["email"], ip)
        return message_page("Доступ закрыт", "Ваш аккаунт заблокирован администратором.", 403, "lock")
    if row is not None:
        con.execute(
            "UPDATE users SET email = ?, name = ?, picture = ?, logins = logins + 1, "
            "last_login = ?, last_ip = ? WHERE id = ?",
            (info["email"], info["name"], info["picture"], ts, ip, row["id"]))
        uid = row["id"]
        session["flash"] = "Вы вошли как %s" % info["name"]
    else:
        cur = con.execute(
            "INSERT INTO users(google_sub, email, name, picture, logins, created_at, last_login, last_ip) "
            "VALUES(?, ?, ?, ?, 1, ?, ?, ?)",
            (info["sub"], info["email"], info["name"], info["picture"], ts, ts, ip))
        uid = cur.lastrowid
        session["flash"] = "Добро пожаловать, %s! Аккаунт создан." % info["name"]
    con.commit()
    session["uid"] = uid
    session.permanent = True
    csrf_token()
    return redirect(pending.get("next") or "/")


@app.post("/auth/logout")
def auth_logout():
    if csrf_ok(request.form.get("csrf")):
        session.pop("uid", None)
    return redirect("/")


# ------------------------------------------------------------- авторизация --

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not is_admin():
            return bad("Нужно войти в админку", 401)
        if request.method not in ("GET", "HEAD") and not csrf_ok(request.headers.get("X-CSRF-Token")):
            return bad("Сессия устарела — обновите страницу", 403)
        return fn(*args, **kwargs)
    return wrapper


def login_locked(con, ip):
    row = con.execute("SELECT fails, last FROM login_fail WHERE ip = ?", (ip,)).fetchone()
    return bool(row) and row["fails"] >= LOGIN_MAX_FAILS and now() - row["last"] < LOGIN_LOCK_SECONDS


def login_failed(con, ip, event):
    row = con.execute("SELECT fails, last FROM login_fail WHERE ip = ?", (ip,)).fetchone()
    fails = 1 if not row or now() - row["last"] >= LOGIN_LOCK_SECONDS else row["fails"] + 1
    con.execute(
        "INSERT INTO login_fail(ip, fails, last) VALUES(?, ?, ?) "
        "ON CONFLICT(ip) DO UPDATE SET fails = excluded.fails, last = excluded.last",
        (ip, fails, now()))
    con.commit()
    log_event(event, "Попытка %d из %d" % (fails, LOGIN_MAX_FAILS), ip)
    if fails == LOGIN_MAX_FAILS:
        log_event("login_locked", "Вход заблокирован на %d мин" % (LOGIN_LOCK_SECONDS // 60), ip)


def twofa_pending():
    p = session.get("2fa")
    return bool(p) and now() - to_int(p.get("ts")) < TWOFA_TTL


def render_login(error="", status=200):
    s = get_settings()
    step = "2fa" if twofa_pending() else "password"
    return render_template("login.html", csrf=csrf_token(), error=error, step=step,
                           has_password=bool(s.get("admin_password_hash")), site=s), status


def finish_admin_login(con, ip):
    con.execute("DELETE FROM login_fail WHERE ip = ?", (ip,))
    con.commit()
    uid = session.get("uid")
    session.clear()
    if uid:
        session["uid"] = uid
    session.permanent = True
    session["admin"] = True
    session["ver"] = get_settings(con)["session_ver"]
    session["csrf"] = secrets.token_hex(16)
    log_event("admin_login", "", ip)


@app.get("/admin")
@app.get("/admin/")
def admin_page():
    if not is_admin():
        return render_login()
    return render_template("admin.html", csrf=csrf_token(), data=admin_payload(),
                           site=get_settings())


@app.post("/admin/login")
def admin_login():
    con = db()
    ip = client_ip()
    session.pop("2fa", None)
    if login_locked(con, ip):
        return render_login("Слишком много попыток. Подождите 10 минут.", 429)
    if not csrf_ok(request.form.get("csrf")):
        return render_login("Страница устарела — попробуйте ещё раз.", 400)
    s = get_settings(con)
    if not s["admin_password_hash"]:
        return render_login("Пароль ещё не задан. Задайте его на сервере.", 400)
    if not check_password_hash(s["admin_password_hash"], request.form.get("password", "")):
        login_failed(con, ip, "login_fail")
        time.sleep(0.4)
        return render_login("Неверный пароль", 401)
    if s["admin_totp_secret"]:
        session["2fa"] = {"ts": now()}
        return redirect("/admin")
    finish_admin_login(con, ip)
    return redirect("/admin")


@app.post("/admin/2fa")
def admin_2fa():
    con = db()
    ip = client_ip()
    if not twofa_pending():
        session.pop("2fa", None)
        return render_login("Время вышло — введите пароль заново.", 400)
    if login_locked(con, ip):
        session.pop("2fa", None)
        return render_login("Слишком много попыток. Подождите 10 минут.", 429)
    if not csrf_ok(request.form.get("csrf")):
        return render_login("Страница устарела — попробуйте ещё раз.", 400)
    s = get_settings(con)
    counter = sec.totp_match(s["admin_totp_secret"], request.form.get("code"),
                             to_int(s["admin_totp_last"]))
    if counter is None:
        login_failed(con, ip, "2fa_fail")
        time.sleep(0.4)
        return render_login("Неверный код. Проверьте время на телефоне.", 401)
    set_setting(con, "admin_totp_last", counter)
    con.commit()
    finish_admin_login(con, ip)
    return redirect("/admin")


@app.post("/admin/logout")
def admin_logout():
    if csrf_ok(request.form.get("csrf")):
        uid = session.get("uid")
        session.clear()
        if uid:
            session["uid"] = uid
    return redirect("/admin")


# ---------------------------------------------------------------- админ API --

def user_admin(row):
    return {
        "id": row["id"], "email": row["email"], "name": row["name"], "picture": row["picture"],
        "blocked": bool(row["blocked"]), "logins": row["logins"], "downloads": row["downloads"],
        "created_at": row["created_at"], "last_login": row["last_login"], "last_ip": row["last_ip"],
    }


def admin_payload():
    con = db()
    con.execute("DELETE FROM ip_blocks WHERE until > 0 AND until < ?", (now(),))
    con.commit()
    data = public_data()
    s = get_settings(con)
    data["settings"] = {k: s.get(k, "") for k in PUBLIC_SETTINGS + ("site_url", "apk_version")}
    data["google"] = {
        "client_id": s["google_client_id"],
        "has_secret": bool(s["google_client_secret"]),
        "enabled": google_enabled(s),
        "redirect_uri": google_redirect_uri(s),
        "require_files": s["require_login_files"] == "1",
        "require_apk": s["require_login_apk"] == "1",
    }
    data["users"] = [user_admin(r) for r in con.execute(
        "SELECT * FROM users ORDER BY last_login DESC LIMIT 500")]
    data["stats"]["users"] = con.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    blocks = []
    for r in con.execute("SELECT * FROM ip_blocks ORDER BY created_at DESC LIMIT 300"):
        net = sec.parse_network(r["net"])
        shown = str(net.network_address) if net is not None and net.num_addresses == 1 else r["net"]
        blocks.append({"net": r["net"], "shown": shown, "reason": r["reason"],
                       "until": r["until"], "created_at": r["created_at"]})
    data["security"] = {
        "ip": client_ip(),
        "via_cloudflare": via_cloudflare(),
        "https": is_https(),
        "cf_only": s["cf_only"] == "1",
        "twofa": bool(s["admin_totp_secret"]),
        "blocks": blocks,
        "log": [dict(r) for r in con.execute(
            "SELECT ts, ip, event, detail FROM security_log ORDER BY id DESC LIMIT 80")],
        "limits": {
            "general": RATE_GENERAL[0], "ban_minutes": AUTO_BAN_MINUTES,
            "login_fails": LOGIN_MAX_FAILS, "login_lock": LOGIN_LOCK_SECONDS // 60,
        },
    }
    return data


@app.get("/admin/api/data")
@admin_required
def admin_data():
    return jsonify(admin_payload())


def insert_file(con, title, description, filename, code, requirements):
    size, lines = code_stats(code)
    fid = secrets.token_hex(6)
    ts = now()
    con.execute(
        "INSERT INTO files(id, title, description, filename, code, requirements, size, lines, "
        "downloads, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
        (fid, title, description, filename, code, requirements, size, lines, ts, ts))
    return fid


@app.post("/admin/api/files")
@admin_required
def admin_create_file():
    con = db()
    form = request.form
    description = clean_text(form.get("description"), 600)
    requirements = " ".join(parse_requirements(form.get("requirements")))
    uploads = [u for u in request.files.getlist("files") if u and u.filename]
    created = []
    try:
        if uploads:
            for up in uploads:
                filename = clean_filename(up.filename, ".py")
                raw = up.read(MAX_PY_BYTES + 1)
                if len(raw) > MAX_PY_BYTES:
                    raise ValueError("%s: файл больше 1 МБ" % filename)
                code = decode_code(raw)
                title = clean_text(form.get("title"), 120) if len(uploads) == 1 else ""
                created.append(insert_file(con, title or title_from_filename(filename),
                                           description, filename, code, requirements))
        else:
            code = (form.get("code") or "").replace("\r\n", "\n").replace("\r", "\n")
            if not code.strip():
                raise ValueError("Выберите .py файл или вставьте код")
            filename = clean_filename(form.get("filename") or "script.py", ".py")
            title = clean_text(form.get("title"), 120) or title_from_filename(filename)
            created.append(insert_file(con, title, description, filename, code, requirements))
    except ValueError as e:
        con.rollback()
        return bad(str(e))
    con.commit()
    return jsonify(ok=True, created=created)


@app.put("/admin/api/files/<fid>")
@admin_required
def admin_update_file(fid):
    row = get_file_or_404(fid)
    d = request.get_json(silent=True) or {}
    try:
        title = clean_text(d.get("title", row["title"]), 120)
        filename = clean_filename(d.get("filename", row["filename"]), ".py")
        description = clean_text(d.get("description", row["description"]), 600)
        requirements = " ".join(parse_requirements(d.get("requirements", row["requirements"])))
        code = d.get("code", row["code"])
        if not isinstance(code, str) or not code.strip():
            raise ValueError("Код не может быть пустым")
        code = code.replace("\r\n", "\n").replace("\r", "\n")
        size, lines = code_stats(code)
    except ValueError as e:
        return bad(str(e))
    con = db()
    con.execute(
        "UPDATE files SET title = ?, filename = ?, description = ?, requirements = ?, code = ?, "
        "size = ?, lines = ?, updated_at = ? WHERE id = ?",
        (title or title_from_filename(filename), filename, description, requirements, code,
         size, lines, now(), fid))
    con.commit()
    return jsonify(ok=True)


@app.delete("/admin/api/files/<fid>")
@admin_required
def admin_delete_file(fid):
    get_file_or_404(fid)
    con = db()
    con.execute("DELETE FROM files WHERE id = ?", (fid,))
    con.commit()
    return jsonify(ok=True)


@app.post("/admin/api/apk")
@admin_required
def admin_upload_apk():
    up = request.files.get("apk")
    if not up or not up.filename:
        return bad("Выберите APK файл")
    try:
        name = clean_filename(up.filename, ".apk")
    except ValueError as e:
        return bad(str(e))
    tmp = os.path.join(APK_DIR, ".upload-%s.tmp" % secrets.token_hex(6))
    try:
        up.save(tmp)
        size = os.path.getsize(tmp)
        with open(tmp, "rb") as f:
            magic = f.read(4)
        if magic != b"PK\x03\x04":
            raise ValueError("Это не похоже на APK файл")
        if size < 1024:
            raise ValueError("Файл слишком маленький для APK")
        os.replace(tmp, APK_PATH)
    except ValueError as e:
        return bad(str(e))
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    con = db()
    set_setting(con, "apk_name", name)
    set_setting(con, "apk_size", size)
    set_setting(con, "apk_updated", now())
    version = clean_text(request.form.get("version"), 40)
    if version:
        set_setting(con, "apk_version", version)
    con.commit()
    return jsonify(ok=True)


@app.delete("/admin/api/apk")
@admin_required
def admin_delete_apk():
    if os.path.isfile(APK_PATH):
        os.unlink(APK_PATH)
    con = db()
    for key in ("apk_name", "apk_version"):
        set_setting(con, key, "")
    set_setting(con, "apk_size", 0)
    con.commit()
    return jsonify(ok=True)


@app.post("/admin/api/steps/<key>/photo")
@admin_required
def admin_step_photo(key):
    if key not in STEP_KEYS:
        abort(404)
    con = db()
    current = step_photos(get_settings(con), key)
    if len(current) >= MAX_STEP_PHOTOS:
        return bad("Максимум %d фото на шаг — удалите лишнее" % MAX_STEP_PHOTOS)
    up = request.files.get("photo")
    if not up or not up.filename:
        return bad("Выберите фото")
    raw = up.read(MAX_IMG_BYTES + 1)
    if len(raw) > MAX_IMG_BYTES:
        return bad("Фото больше 15 МБ")
    ext = image_ext(raw)
    if not ext:
        return bad("Подходят только JPG, PNG или WEBP")
    name = "step_%s_%s.%s" % (key, secrets.token_hex(4), ext)
    with open(os.path.join(MEDIA_DIR, name), "wb") as f:
        f.write(raw)
    set_setting(con, "step_photo_" + key, ",".join(current + [name]))
    con.commit()
    return jsonify(ok=True, url="/media/" + name)


@app.delete("/admin/api/steps/<key>/photo")
@admin_required
def admin_step_photo_delete(key):
    """Удаляет одно фото (?name=...) или все фото шага."""
    if key not in STEP_KEYS:
        abort(404)
    con = db()
    current = step_photos(get_settings(con), key)
    name = request.args.get("name", "")
    remove = [n for n in current if not name or n == name]
    keep = [n for n in current if n not in remove]
    set_setting(con, "step_photo_" + key, ",".join(keep))
    con.commit()
    for n in remove:
        remove_media(n)
    return jsonify(ok=True)


def remove_media(name):
    if name and MEDIA_RE.fullmatch(name):
        path = os.path.join(MEDIA_DIR, name)
        if os.path.isfile(path):
            os.unlink(path)


@app.post("/admin/api/settings")
@admin_required
def admin_settings():
    d = request.get_json(silent=True) or {}
    updates = {}
    try:
        if "site_title" in d:
            updates["site_title"] = clean_text(d["site_title"], 60)
            if not updates["site_title"]:
                raise ValueError("Название сайта не может быть пустым")
        if "site_subtitle" in d:
            updates["site_subtitle"] = clean_text(d["site_subtitle"], 300)
        if "site_url" in d:
            updates["site_url"] = clean_site_url(d["site_url"])
        if "play_url" in d:
            updates["play_url"] = clean_url(d["play_url"])
        if "contact_url" in d:
            updates["contact_url"] = clean_url(d["contact_url"])
        if "apk_version" in d:
            updates["apk_version"] = clean_text(d["apk_version"], 40)
    except ValueError as e:
        return bad(str(e))
    con = db()
    for k, v in updates.items():
        set_setting(con, k, v)
    con.commit()
    return jsonify(ok=True)


@app.post("/admin/api/password")
@admin_required
def admin_password():
    d = request.get_json(silent=True) or {}
    con = db()
    if not check_password_hash(get_settings(con)["admin_password_hash"], str(d.get("current", ""))):
        return bad("Текущий пароль неверный")
    new = str(d.get("new", ""))
    if len(new) < 8:
        return bad("Новый пароль — минимум 8 символов")
    ver = save_password(con, new)
    session["ver"] = ver          # эта сессия остаётся, остальные выходят
    log_event("password_changed", "Другие сессии админки завершены")
    return jsonify(ok=True)


def save_password(con, password):
    ver = secrets.token_hex(8)
    set_setting(con, "admin_password_hash", generate_password_hash(password))
    set_setting(con, "session_ver", ver)
    con.commit()
    return ver


# --- Google и пользователи

@app.post("/admin/api/google")
@admin_required
def admin_google():
    d = request.get_json(silent=True) or {}
    con = db()
    client_id = clean_text(d.get("client_id"), 200)
    if client_id and not re.fullmatch(r"[\w.\-]+\.apps\.googleusercontent\.com", client_id):
        return bad("Client ID должен заканчиваться на .apps.googleusercontent.com")
    set_setting(con, "google_client_id", client_id)
    secret = clean_text(d.get("client_secret"), 200)
    if secret:
        set_setting(con, "google_client_secret", secret)
    if d.get("clear_secret") or not client_id:
        set_setting(con, "google_client_secret", "")
    set_setting(con, "require_login_files", "1" if d.get("require_files") else "0")
    set_setting(con, "require_login_apk", "1" if d.get("require_apk") else "0")
    con.commit()
    log_event("google_settings", "Client ID %s" % ("задан" if client_id else "удалён"))
    return jsonify(ok=True)


@app.post("/admin/api/users/<int:uid>/block")
@admin_required
def admin_user_block(uid):
    d = request.get_json(silent=True) or {}
    con = db()
    row = con.execute("SELECT email FROM users WHERE id = ?", (uid,)).fetchone()
    if row is None:
        abort(404)
    blocked = bool(d.get("blocked"))
    con.execute("UPDATE users SET blocked = ? WHERE id = ?", (1 if blocked else 0, uid))
    con.commit()
    log_event("user_blocked" if blocked else "user_unblocked", row["email"])
    return jsonify(ok=True)


@app.delete("/admin/api/users/<int:uid>")
@admin_required
def admin_user_delete(uid):
    con = db()
    row = con.execute("SELECT email FROM users WHERE id = ?", (uid,)).fetchone()
    if row is None:
        abort(404)
    con.execute("DELETE FROM users WHERE id = ?", (uid,))
    con.commit()
    log_event("user_deleted", row["email"])
    return jsonify(ok=True)


# --- Защита: Cloudflare, блокировки IP, 2FA

@app.post("/admin/api/security/cloudflare")
@admin_required
def admin_cloudflare():
    d = request.get_json(silent=True) or {}
    enabled = bool(d.get("enabled"))
    if enabled and not via_cloudflare():
        return bad("Сейчас админка открыта не через Cloudflare. Откройте её по адресу домена, "
                   "иначе после включения вы потеряете доступ.")
    con = db()
    set_setting(con, "cf_only", "1" if enabled else "0")
    con.commit()
    guard_cache.reset()
    log_event("cf_only_on" if enabled else "cf_only_off")
    return jsonify(ok=True)


@app.post("/admin/api/blocks")
@admin_required
def admin_block_add():
    d = request.get_json(silent=True) or {}
    net = sec.parse_network(d.get("ip"))
    if net is None:
        return bad("Введите IP-адрес, например 203.0.113.7, или подсеть 203.0.113.0/24")
    if (net.version == 4 and net.prefixlen < 16) or (net.version == 6 and net.prefixlen < 32):
        return bad("Слишком большая подсеть")
    me = sec.parse_ip(client_ip())
    if me is not None and me.version == net.version and me in net:
        return bad("Нельзя заблокировать собственный IP")
    minutes = max(0, min(to_int(d.get("minutes")), 525600))
    reason = clean_text(d.get("reason"), 120) or "Вручную"
    block_ip(db(), str(net), reason, minutes)
    log_event("ip_blocked", "%s — %s" % (net, reason))
    return jsonify(ok=True)


@app.post("/admin/api/blocks/delete")
@admin_required
def admin_block_delete():
    d = request.get_json(silent=True) or {}
    net = clean_text(d.get("net"), 64)
    con = db()
    con.execute("DELETE FROM ip_blocks WHERE net = ?", (net,))
    con.commit()
    blocks_cache.reset()
    log_event("ip_unblocked", net)
    return jsonify(ok=True)


@app.post("/admin/api/2fa/setup")
@admin_required
def admin_2fa_setup():
    secret = sec.new_totp_secret()
    session["totp_setup"] = secret
    s = get_settings()
    uri = sec.totp_uri(secret, "admin", s["site_title"] or "VPN Python")
    return jsonify(ok=True, secret=secret, uri=uri, qr=sec.qr_svg(uri))


@app.post("/admin/api/2fa/enable")
@admin_required
def admin_2fa_enable():
    d = request.get_json(silent=True) or {}
    secret = session.get("totp_setup")
    if not secret:
        return bad("Начните настройку заново")
    counter = sec.totp_match(secret, d.get("code"))
    if counter is None:
        return bad("Код не подошёл. Проверьте, что время на телефоне установлено автоматически")
    con = db()
    set_setting(con, "admin_totp_secret", secret)
    set_setting(con, "admin_totp_last", counter)
    con.commit()
    session.pop("totp_setup", None)
    log_event("2fa_on")
    return jsonify(ok=True)


@app.post("/admin/api/2fa/disable")
@admin_required
def admin_2fa_disable():
    d = request.get_json(silent=True) or {}
    con = db()
    s = get_settings(con)
    counter = sec.totp_match(s["admin_totp_secret"], d.get("code"), to_int(s["admin_totp_last"]))
    if counter is None:
        return bad("Неверный код")
    set_setting(con, "admin_totp_secret", "")
    set_setting(con, "admin_totp_last", 0)
    con.commit()
    log_event("2fa_off")
    return jsonify(ok=True)


# ---------------------------------------------------------------------- CLI --

def cli(argv):
    cmd = argv[0] if argv else ""
    if cmd in ("set-password", "--set-password"):
        if "--stdin" in argv:
            password = sys.stdin.readline().rstrip("\r\n")
        else:
            import getpass
            password = getpass.getpass("Новый пароль админки: ")
            if getpass.getpass("Повторите пароль: ") != password:
                print("Пароли не совпадают.")
                return 1
        if len(password) < 8:
            print("Пароль должен быть не короче 8 символов.")
            return 1
        con = connect()
        try:
            save_password(con, password)
        finally:
            con.close()
        print("Пароль админки сохранён.")
        return 0
    if cmd == "has-password":
        con = connect()
        try:
            return 0 if get_settings(con).get("admin_password_hash") else 1
        finally:
            con.close()
    if cmd == "reset-2fa":
        con = connect()
        try:
            set_setting(con, "admin_totp_secret", "")
            set_setting(con, "admin_totp_last", 0)
            con.commit()
        finally:
            con.close()
        print("Двухфакторная защита админки отключена.")
        return 0
    if cmd == "unblock-all":
        con = connect()
        try:
            con.execute("DELETE FROM ip_blocks")
            con.execute("DELETE FROM login_fail")
            set_setting(con, "cf_only", "0")
            con.commit()
        finally:
            con.close()
        print("Все блокировки IP сняты, режим «только Cloudflare» выключен.")
        return 0
    port = int(os.environ.get("PORT", "8000"))
    app.run(host=os.environ.get("HOST", "0.0.0.0"), port=port, debug=False)
    return 0


if __name__ == "__main__":
    sys.exit(cli(sys.argv[1:]))
