#!/usr/bin/env python3
"""VPN Python — сайт: Pydroid 3 (APK), фото-инструкция, готовые .py файлы
и маленькая админ-панель с паролем.

Запуск для разработки:   python3 app.py            (http://localhost:8000)
Задать пароль админки:    python3 app.py set-password
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
from urllib.parse import quote

from flask import (
    Flask,
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
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.security import check_password_hash, generate_password_hash

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

LOGIN_MAX_FAILS = 5
LOGIN_LOCK_SECONDS = 10 * 60

PUBLIC_SETTINGS = ("site_title", "site_subtitle", "play_url", "contact_url")

DEFAULT_SETTINGS = {
    "site_title": "VPN Python",
    "site_subtitle": (
        "Запускайте Python-скрипты прямо на телефоне. Скачайте Pydroid 3, "
        "пройдите фото-инструкцию и запускайте готовые .py файлы в пару касаний."
    ),
    "play_url": "https://play.google.com/store/apps/details?id=ru.iiec.pydroid3",
    "contact_url": "",
    "apk_name": "",
    "apk_size": "0",
    "apk_version": "",
    "apk_updated": "0",
    "apk_downloads": "0",
    "admin_password_hash": "",
    "session_ver": "",
}

STEPS = [
    {
        "key": "download",
        "title": "Скачайте Pydroid 3",
        "text": "Нажмите кнопку «Скачать Pydroid 3» вверху сайта. Если браузер "
                "спросит — нажмите «Скачать» или «Всё равно скачать».",
        "tips": ["Файл сохранится в папку «Загрузки» (Download)."],
    },
    {
        "key": "unknown",
        "title": "Разрешите установку",
        "text": "Откройте скачанный файл. Android покажет «Установка заблокирована» — "
                "нажмите «Настройки» и включите «Разрешить из этого источника».",
        "tips": ["Это нужно сделать только один раз для вашего браузера."],
    },
    {
        "key": "install",
        "title": "Установите приложение",
        "text": "Вернитесь назад и нажмите «Установить». Через несколько секунд "
                "приложение будет готово.",
        "tips": ["Если Play Защита спросит — нажмите «Подробнее» → «Всё равно установить»."],
    },
    {
        "key": "open",
        "title": "Откройте Pydroid 3",
        "text": "Найдите иконку Pydroid 3 на рабочем столе или в меню приложений. "
                "При первом запуске подождите, пока приложение подготовит Python.",
        "tips": ["Для первого запуска нужен интернет."],
    },
    {
        "key": "storage",
        "title": "Дайте доступ к хранилищу",
        "text": "Когда появится запрос доступа к файлам — нажмите «Разрешить». "
                "Без этого Pydroid 3 не увидит скачанные .py файлы.",
        "tips": [
            "Не было запроса? Настройки → Приложения → Pydroid 3 → Разрешения → "
            "Файлы и медиа → Разрешить.",
            "Android 11 и новее: Настройки → Приложения → Специальный доступ → "
            "Доступ ко всем файлам → Pydroid 3 → Вкл.",
        ],
    },
    {
        "key": "file",
        "title": "Откройте .py файл",
        "text": "Скачайте нужный файл в разделе «Файлы». В Pydroid 3 нажмите меню ☰ → "
                "«Open» → «Internal storage» → «Download» и выберите файл.",
        "tips": ["Или нажмите «Копировать» у файла и вставьте код в редактор Pydroid: "
                 "долгое нажатие → «Вставить»."],
    },
    {
        "key": "run",
        "title": "Запустите код",
        "text": "Нажмите жёлтую кнопку ▶ внизу справа. Откроется терминал "
                "с результатом работы программы.",
        "tips": ["Ошибка ModuleNotFoundError? Меню ☰ → «Pip» → впишите название "
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


def public_data():
    con = db()
    s = get_settings(con)
    files = [file_meta(r) for r in con.execute(
        "SELECT %s FROM files ORDER BY created_at DESC, rowid DESC" % FILE_COLUMNS)]
    apk = apk_info(s)
    steps = []
    for st in STEPS:
        photo = s.get("step_photo_" + st["key"], "")
        steps.append(dict(st, photo=("/media/" + photo) if photo else ""))
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
    }


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


def bad(message, status=400):
    return jsonify(ok=False, error=message), status


# --------------------------------------------------------------- приложение --

init_db()
app = Flask(__name__)
app.config.update(
    SECRET_KEY=load_secret_key(),
    MAX_CONTENT_LENGTH=MAX_APK_BYTES + 2 * 1024 * 1024,
    MAX_FORM_MEMORY_SIZE=4 * 1024 * 1024,
    SESSION_COOKIE_NAME="vp_session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE") == "1",
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
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
    "img-src 'self' data: blob:; "
    "connect-src 'self'; "
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
)


@app.after_request
def security_headers(resp):
    resp.headers.setdefault("Content-Security-Policy", CSP)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "same-origin")
    if request.path.startswith("/admin"):
        resp.headers["Cache-Control"] = "no-store"
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


# ---------------------------------------------------------- публичная часть --

@app.get("/")
def index():
    data = public_data()
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
    data = file_meta(row)
    data["code"] = row["code"]
    return jsonify(data)


@app.get("/dl/<fid>/<path:_name>")
def download_py(fid, _name):
    row = get_file_or_404(fid)
    con = db()
    con.execute("UPDATE files SET downloads = downloads + 1 WHERE id = ?", (fid,))
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
    rng = request.headers.get("Range", "")
    if not rng or rng.replace(" ", "").startswith("bytes=0-"):
        con = db()
        con.execute(
            "UPDATE settings SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) "
            "WHERE key = 'apk_downloads'")
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


# ------------------------------------------------------------- авторизация --

def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_hex(16)
    return session["csrf"]


def csrf_ok(token):
    expected = session.get("csrf", "")
    return bool(expected) and hmac.compare_digest(
        (token or "").encode("utf-8"), expected.encode("utf-8"))


def is_admin():
    if session.get("admin") is not True:
        return False
    ver = get_settings().get("session_ver", "")
    return bool(ver) and hmac.compare_digest(session.get("ver", "").encode(), ver.encode())


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


def login_failed(con, ip):
    row = con.execute("SELECT fails, last FROM login_fail WHERE ip = ?", (ip,)).fetchone()
    fails = 1 if not row or now() - row["last"] >= LOGIN_LOCK_SECONDS else row["fails"] + 1
    con.execute(
        "INSERT INTO login_fail(ip, fails, last) VALUES(?, ?, ?) "
        "ON CONFLICT(ip) DO UPDATE SET fails = excluded.fails, last = excluded.last",
        (ip, fails, now()))
    con.commit()


def render_login(error="", status=200):
    has_password = bool(get_settings().get("admin_password_hash"))
    return render_template("login.html", csrf=csrf_token(), error=error,
                           has_password=has_password), status


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
    ip = request.remote_addr or "?"
    if login_locked(con, ip):
        return render_login("Слишком много попыток. Подождите 10 минут.", 429)
    if not csrf_ok(request.form.get("csrf")):
        return render_login("Страница устарела — попробуйте ещё раз.", 400)
    pw_hash = get_settings(con).get("admin_password_hash", "")
    if not pw_hash:
        return render_login("Пароль ещё не задан. Задайте его на сервере.", 400)
    if check_password_hash(pw_hash, request.form.get("password", "")):
        con.execute("DELETE FROM login_fail WHERE ip = ?", (ip,))
        con.commit()
        session.clear()
        session.permanent = True
        session["admin"] = True
        session["ver"] = get_settings(con)["session_ver"]
        session["csrf"] = secrets.token_hex(16)
        return redirect("/admin")
    login_failed(con, ip)
    time.sleep(0.4)
    return render_login("Неверный пароль", 401)


@app.post("/admin/logout")
def admin_logout():
    if csrf_ok(request.form.get("csrf")):
        session.clear()
    return redirect("/admin")


# ---------------------------------------------------------------- админ API --

def admin_payload():
    data = public_data()
    s = get_settings()
    data["settings"] = {k: s.get(k, "") for k in PUBLIC_SETTINGS + ("apk_version",)}
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
    con = db()
    old = get_settings(con).get("step_photo_" + key, "")
    set_setting(con, "step_photo_" + key, name)
    con.commit()
    remove_media(old)
    return jsonify(ok=True, url="/media/" + name)


@app.delete("/admin/api/steps/<key>/photo")
@admin_required
def admin_step_photo_delete(key):
    if key not in STEP_KEYS:
        abort(404)
    con = db()
    old = get_settings(con).get("step_photo_" + key, "")
    con.execute("DELETE FROM settings WHERE key = ?", ("step_photo_" + key,))
    con.commit()
    remove_media(old)
    return jsonify(ok=True)


def remove_media(name):
    if name and re.fullmatch(r"[a-z0-9_]+\.(jpg|png|webp)", name):
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
    if len(new) < 6:
        return bad("Новый пароль — минимум 6 символов")
    ver = save_password(con, new)
    session["ver"] = ver          # эта сессия остаётся, остальные выходят
    return jsonify(ok=True)


def save_password(con, password):
    ver = secrets.token_hex(8)
    set_setting(con, "admin_password_hash", generate_password_hash(password))
    set_setting(con, "session_ver", ver)
    con.commit()
    return ver


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
        if len(password) < 6:
            print("Пароль должен быть не короче 6 символов.")
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
    port = int(os.environ.get("PORT", "8000"))
    app.run(host=os.environ.get("HOST", "0.0.0.0"), port=port, debug=False)
    return 0


if __name__ == "__main__":
    sys.exit(cli(sys.argv[1:]))
