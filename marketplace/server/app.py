"""SystemMarket API — доска объявлений (Flask + SQLite).

Запуск в продакшене: gunicorn -w 2 -b 127.0.0.1:8000 app:app (за nginx).
Локально для разработки: SM_DEV=1 python app.py — тогда Flask сам отдаёт
index.html и загруженные фото.

Ошибки возвращаются как {"error": "<текст по-русски>", "code": "<код>"} —
по коду сайт показывает сообщение на выбранном языке.
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import sqlite3
import time
import warnings
from datetime import timedelta
from functools import wraps

from flask import Flask, abort, g, jsonify, redirect, request, send_from_directory, session
from PIL import Image, ImageOps

import oauth

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get("SM_DATA", os.path.join(HERE, "data"))
UPLOADS = os.path.join(DATA, "uploads")
DB_PATH = os.path.join(DATA, "market.db")
ADMIN_TOKEN = os.environ.get("SM_ADMIN_TOKEN", "")
DEV = os.environ.get("SM_DEV") == "1"
APP_PACKAGE = "click.sstymmarket.app"       # приложение Android (WebView)

CATS = ("auto", "realty", "phones", "electronics", "home", "clothes", "services", "other")
CITIES = {"Ашхабад", "Аркадаг", "Балканабат", "Дашогуз", "Мары", "Туркменабат",
          "Туркменбаши", "Теджен", "Байрамали", "Другой"}
MAX_PHOTOS = 6
MAX_SIDE = 1600
THUMB_SIDE = 480
PER_IP_PER_HOUR = 15
PAGE_MAX = 60
MAX_PRICE = 10_000_000_000

# Фото, видео и голосовые из переписки: имена файлов случайные (их не угадать),
# nginx отдаёт их с жёстко заданным типом и X-Content-Type-Options: nosniff.
CHAT_DIR = os.path.join(DATA, "chat")
MEDIA_NAME_RE = re.compile(r"[a-f0-9]{24}\.(jpg|mp4|mov|webm|weba|ogg|m4a|mp3)")
MEDIA_TYPES = {"jpg": "image/jpeg", "mp4": "video/mp4", "mov": "video/quicktime", "webm": "video/webm",
               "weba": "audio/webm", "ogg": "audio/ogg", "m4a": "audio/mp4", "mp3": "audio/mpeg"}
IMAGE_MAX = 15 * 1024 * 1024
VIDEO_MAX = 30 * 1024 * 1024
AUDIO_MAX = 6 * 1024 * 1024
MEDIA_DAY_BYTES = 300 * 1024 * 1024      # файлов с одного IP за сутки
MIN_FREE_BYTES = 1024 * 1024 * 1024      # на диске всегда остаётся минимум 1 ГБ

os.makedirs(UPLOADS, exist_ok=True)
os.makedirs(CHAT_DIR, exist_ok=True)


def load_secret():
    """Ключ для подписи сессий: создаётся один раз и хранится рядом с базой."""
    p = os.path.join(DATA, "secret.key")
    if not os.path.exists(p):
        tmp = "%s.%d.tmp" % (p, os.getpid())
        with open(tmp, "w") as f:
            f.write(secrets.token_hex(32))
        os.chmod(tmp, 0o600)
        try:
            os.link(tmp, p)            # не перезапишет ключ, если другой процесс успел раньше
        except FileExistsError:
            pass
        finally:
            os.unlink(tmp)
    with open(p) as f:
        return f.read().strip()

# Защита от «бомб» — огромных картинок, которые съедают память.
Image.MAX_IMAGE_PIXELS = 30_000_000
warnings.simplefilter("error", Image.DecompressionBombWarning)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 40 * 1024 * 1024
app.json.ensure_ascii = False
app.config.update(
    SECRET_KEY=load_secret(),
    SESSION_COOKIE_NAME="sm_session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=not DEV,
    PERMANENT_SESSION_LIFETIME=timedelta(days=90),
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS listings (
    id          TEXT PRIMARY KEY,
    cat         TEXT NOT NULL,
    title       TEXT NOT NULL,
    price       INTEGER NOT NULL,
    city        TEXT NOT NULL,
    descr       TEXT NOT NULL DEFAULT '',
    name        TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL,
    extra       TEXT NOT NULL DEFAULT '{}',
    photos      TEXT NOT NULL DEFAULT '[]',
    token_hash  TEXT NOT NULL,
    ip          TEXT NOT NULL DEFAULT '',
    views       INTEGER NOT NULL DEFAULT 0,
    created     INTEGER NOT NULL,
    sold        INTEGER NOT NULL DEFAULT 0,
    updated     INTEGER NOT NULL DEFAULT 0,
    owner_hash  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_created ON listings(created DESC);
CREATE INDEX IF NOT EXISTS idx_cat ON listings(cat, created DESC);
CREATE INDEX IF NOT EXISTS idx_ip ON listings(ip, created);

-- Переписка покупателя с продавцом по конкретному объявлению
CREATE TABLE IF NOT EXISTS conversations (
    id            TEXT PRIMARY KEY,
    listing_id    TEXT NOT NULL,
    buyer_hash    TEXT NOT NULL,
    buyer_name    TEXT NOT NULL DEFAULT '',
    created       INTEGER NOT NULL,
    updated       INTEGER NOT NULL,
    last_text     TEXT NOT NULL DEFAULT '',
    last_sender   TEXT NOT NULL DEFAULT '',
    buyer_unread  INTEGER NOT NULL DEFAULT 0,
    seller_unread INTEGER NOT NULL DEFAULT 0,
    UNIQUE (listing_id, buyer_hash)
);
CREATE INDEX IF NOT EXISTS idx_conv_buyer ON conversations(buyer_hash, updated DESC);
CREATE INDEX IF NOT EXISTS idx_conv_listing ON conversations(listing_id);
CREATE TABLE IF NOT EXISTS messages (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    conv_id  TEXT NOT NULL,
    sender   TEXT NOT NULL,
    body     TEXT NOT NULL,
    created  INTEGER NOT NULL,
    ip       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conv_id, id);
CREATE INDEX IF NOT EXISTS idx_msg_ip ON messages(ip, created);

-- Обращения к администратору (ошибки, вопросы, жалобы)
CREATE TABLE IF NOT EXISTS support_threads (
    id           TEXT PRIMARY KEY,
    owner        TEXT NOT NULL UNIQUE,
    user_id      INTEGER,
    name         TEXT NOT NULL DEFAULT '',
    lang         TEXT NOT NULL DEFAULT '',
    created      INTEGER NOT NULL,
    updated      INTEGER NOT NULL,
    last_text    TEXT NOT NULL DEFAULT '',
    last_kind    TEXT NOT NULL DEFAULT 'text',
    last_sender  TEXT NOT NULL DEFAULT '',
    admin_unread INTEGER NOT NULL DEFAULT 0,
    user_unread  INTEGER NOT NULL DEFAULT 0,
    ip           TEXT NOT NULL DEFAULT '',
    ua           TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_support_updated ON support_threads(updated DESC);
CREATE TABLE IF NOT EXISTS support_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id  TEXT NOT NULL,
    sender     TEXT NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    kind       TEXT NOT NULL DEFAULT 'text',
    media      TEXT NOT NULL DEFAULT '',
    meta       TEXT NOT NULL DEFAULT '{}',
    media_size INTEGER NOT NULL DEFAULT 0,
    created    INTEGER NOT NULL,
    ip         TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_support_msg ON support_messages(thread_id, id);
CREATE INDEX IF NOT EXISTS idx_support_ip ON support_messages(ip, created);

-- Аккаунты Google (вход необязателен)
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    google_sub TEXT NOT NULL UNIQUE,
    email      TEXT NOT NULL,
    name       TEXT NOT NULL,
    picture    TEXT NOT NULL DEFAULT '',
    blocked    INTEGER NOT NULL DEFAULT 0,
    logins     INTEGER NOT NULL DEFAULT 0,
    created    INTEGER NOT NULL,
    last_login INTEGER NOT NULL,
    last_ip    TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Одноразовые коды: вход через Google в браузере → приложение Android
CREATE TABLE IF NOT EXISTS app_codes (
    code_hash TEXT PRIMARY KEY,
    uid       INTEGER NOT NULL,
    expires   INTEGER NOT NULL
);
-- Заблокированные администратором участники (хеш браузера или аккаунта)
CREATE TABLE IF NOT EXISTS bans (
    hash    TEXT PRIMARY KEY,
    reason  TEXT NOT NULL DEFAULT '',
    created INTEGER NOT NULL
);
"""

# Колонки, которых не было в первых версиях базы, — добавляются при запуске.
MIGRATIONS = {
    "listings": {
        "sold": "INTEGER NOT NULL DEFAULT 0",
        "updated": "INTEGER NOT NULL DEFAULT 0",
        "owner_hash": "TEXT NOT NULL DEFAULT ''",
    },
    "conversations": {
        "last_kind": "TEXT NOT NULL DEFAULT 'text'",
    },
    "messages": {
        "kind": "TEXT NOT NULL DEFAULT 'text'",
        "media": "TEXT NOT NULL DEFAULT ''",
        "meta": "TEXT NOT NULL DEFAULT '{}'",
        "media_size": "INTEGER NOT NULL DEFAULT 0",
    },
}
CHAT_MSG_PER_MIN = 20        # сообщений в минуту с одного IP
CHAT_NEW_PER_HOUR = 30       # новых диалогов в час с одного IP
CHAT_MAX_LEN = 2000


def init_db():
    con = sqlite3.connect(DB_PATH, timeout=10)
    try:
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript(SCHEMA)
        for table, columns in MIGRATIONS.items():
            have = {r[1] for r in con.execute(f"PRAGMA table_info({table})")}
            for column, decl in columns.items():
                if column not in have:
                    try:
                        con.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")
                    except sqlite3.OperationalError:
                        pass  # другой процесс gunicorn успел добавить колонку
        con.execute("CREATE INDEX IF NOT EXISTS idx_owner ON listings(owner_hash)")
        con.commit()
    finally:
        con.close()


init_db()


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, timeout=10)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    con = g.pop("db", None)
    if con is not None:
        con.close()


# ---------------------------------------------------------------- helpers
def err(msg, status=400, code="bad_request"):
    return jsonify({"error": msg, "code": code}), status


def client_ip():
    # gunicorn слушает только 127.0.0.1, поэтому заголовок ставит наш nginx.
    return (request.headers.get("X-Real-IP") or request.remote_addr or "")[:64]


def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


def clean(s, limit):
    s = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", str(s or "")).strip()
    return s[:limit]


def to_int(s, lo, hi):
    try:
        n = int(str(s).replace(" ", ""))
    except (TypeError, ValueError):
        return None
    return n if lo <= n <= hi else None


def photo_urls(names):
    return [{"url": f"/uploads/{n}.jpg", "thumb": f"/uploads/{n}_t.jpg"} for n in names]


def public(row):
    return {
        "id": row["id"], "cat": row["cat"], "title": row["title"], "price": row["price"],
        "city": row["city"], "desc": row["descr"], "name": row["name"], "phone": row["phone"],
        "extra": json.loads(row["extra"]), "photos": photo_urls(json.loads(row["photos"])),
        "views": row["views"], "created": row["created"],
        "sold": bool(row["sold"]), "updated": row["updated"],
    }


def save_photo(fs):
    """Пересохраняет фото: поворот по EXIF, уменьшение, удаление метаданных (GPS и т.п.)."""
    try:
        img = Image.open(fs.stream)
        if img.format not in ("JPEG", "PNG", "WEBP", "MPO", "GIF"):
            raise ValueError
        img.draft("RGB", (MAX_SIDE, MAX_SIDE))
        img = ImageOps.exif_transpose(img).convert("RGB")
    except Exception:
        raise ValueError("Не удалось прочитать фото. Подходят JPG, PNG, WEBP.")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    name = secrets.token_hex(12)
    img.save(os.path.join(UPLOADS, name + ".jpg"), "JPEG", quality=82, optimize=True, progressive=True)
    img.thumbnail((THUMB_SIDE, THUMB_SIDE))
    img.save(os.path.join(UPLOADS, name + "_t.jpg"), "JPEG", quality=78, optimize=True)
    return name


def delete_photo_files(names):
    for n in names:
        for suffix in (".jpg", "_t.jpg"):
            try:
                os.remove(os.path.join(UPLOADS, n + suffix))
            except FileNotFoundError:
                pass


EXTRA_FIELDS = {
    "auto": ("brand", "model", "year", "mileage", "gear", "fuel"),
    "realty": ("deal", "rooms", "area", "floor"),
}


def parse_extra(cat, f):
    if cat == "auto":
        return {
            "brand": clean(f.get("brand"), 40), "model": clean(f.get("model"), 40),
            "year": to_int(f.get("year"), 1950, 2035), "mileage": to_int(f.get("mileage"), 0, 5_000_000),
            "gear": clean(f.get("gear"), 20), "fuel": clean(f.get("fuel"), 20),
        }
    if cat == "realty":
        return {
            "deal": clean(f.get("deal"), 20), "rooms": to_int(f.get("rooms"), 0, 50),
            "area": to_int(f.get("area"), 0, 100_000), "floor": to_int(f.get("floor"), -5, 200),
        }
    return {}


def check_fields(title, price, city, phone):
    """Общая проверка полей объявления. Возвращает ответ-ошибку или None."""
    if title is not None and len(title) < 3:
        return err("Заголовок слишком короткий", code="title")
    if price is None:
        return err("Укажите цену", code="price")
    if city is not None and city not in CITIES:
        return err("Выберите город", code="city")
    if phone is not None and len(re.sub(r"\D", "", phone)) < 6:
        return err("Укажите телефон", code="phone")
    return None


UID_RE = re.compile(r"[A-Za-z0-9_-]{32,128}")


def device_hash():
    """Анонимный ключ браузера (заголовок X-User-Key) → его хеш. Сам ключ на сервере не хранится."""
    key = request.headers.get("X-User-Key", "")
    return sha("u:" + key) if UID_RE.fullmatch(key) else None


def account_hash(uid):
    return sha("acct:%d" % uid)


def current_user():
    """Аккаунт Google, если посетитель вошёл и не заблокирован."""
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


def user_hash():
    """Кто делает запрос: аккаунт Google (если вошёл) или ключ этого браузера.
    Ключ браузера нужен всегда — так запрос точно отправил наш сайт, а не чужой."""
    dev = device_hash()
    if not dev:
        return None
    u = current_user()
    return account_hash(u["id"]) if u is not None else dev


def is_admin():
    token = request.headers.get("X-Admin-Token") or request.headers.get("X-Edit-Token", "")
    return bool(ADMIN_TOKEN and token and hmac.compare_digest(token, ADMIN_TOKEN))


def is_owner(row):
    me = user_hash()
    return bool(me and row["owner_hash"]) and hmac.compare_digest(me, row["owner_hash"])


def edit_rights(row):
    token = request.headers.get("X-Edit-Token", "")
    by_token = bool(token) and hmac.compare_digest(sha(token), row["token_hash"])
    return by_token or is_admin() or is_owner(row)


def banned(con, who):
    return bool(who) and con.execute("SELECT 1 FROM bans WHERE hash = ?", (who,)).fetchone() is not None


@app.after_request
def private_no_store(resp):
    if request.path.startswith(("/api/me", "/api/chats", "/api/support", "/api/admin", "/auth/")):
        resp.headers["Cache-Control"] = "no-store"
    return resp


# ---------------------------------------------------------------- routes
@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/stats")
def stats():
    rows = db().execute("SELECT cat, COUNT(*) FROM listings WHERE sold = 0 GROUP BY cat").fetchall()
    cats = {c: 0 for c in CATS}
    for cat, n in rows:
        if cat in cats:
            cats[cat] = n
    return {"total": sum(cats.values()), "cats": cats}


@app.get("/api/listings")
def list_listings():
    a = request.args
    where, params = [], []
    ids = [i for i in a.get("ids", "").split(",") if re.fullmatch(r"[a-z0-9]{6,32}", i)][:200]
    if "ids" in a:
        if not ids:
            return {"items": [], "total": 0}
        where.append("id IN (%s)" % ",".join("?" * len(ids)))
        params += ids
    elif a.get("with_sold") != "1":
        where.append("sold = 0")           # в общей ленте проданные не показываем
    if a.get("cat") in CATS:
        where.append("cat = ?")
        params.append(a["cat"])
    if a.get("city") in CITIES:
        where.append("city = ?")
        params.append(a["city"])
    lo = to_int(a.get("min_price"), 0, MAX_PRICE)
    hi = to_int(a.get("max_price"), 0, MAX_PRICE)
    if lo:
        where.append("price >= ?")
        params.append(lo)
    if hi:
        where.append("price <= ? AND price > 0")
        params.append(hi)
    if a.get("with_photos") == "1":
        where.append("photos <> '[]'")    # только объявления с фото
    ex = a.get("exclude", "")
    if re.fullmatch(r"[a-z0-9]{6,32}", ex):
        where.append("id <> ?")
        params.append(ex)
    q = clean(a.get("q"), 60).lower()
    if q:
        like = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        where.append("(lower(title) LIKE ? ESCAPE '\\' OR lower(descr) LIKE ? ESCAPE '\\' OR lower(extra) LIKE ? ESCAPE '\\')")
        params += [like, like, like]
    order = {
        "cheap": "price = 0, price ASC, created DESC",
        "exp": "price DESC, created DESC",
        "popular": "views DESC, created DESC",
    }.get(a.get("sort"), "created DESC")
    limit = to_int(a.get("limit", 24), 1, PAGE_MAX) or 24
    offset = to_int(a.get("offset", 0), 0, 1_000_000) or 0
    w = ("WHERE " + " AND ".join(where)) if where else ""
    total = db().execute(f"SELECT COUNT(*) FROM listings {w}", params).fetchone()[0]
    rows = db().execute(f"SELECT * FROM listings {w} ORDER BY {order} LIMIT ? OFFSET ?", params + [limit, offset]).fetchall()
    return {"items": [public(r) for r in rows], "total": total}


@app.get("/api/listings/<lid>")
def get_listing(lid):
    con = db()
    con.execute("UPDATE listings SET views = views + 1 WHERE id = ?", (lid,))
    con.commit()
    row = con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone()
    if not row:
        return err("Объявление не найдено", 404, "not_found")
    return dict(public(row), own=is_owner(row))


@app.post("/api/listings")
def create_listing():
    f = request.form
    ip = client_ip()
    con = db()
    recent = con.execute("SELECT COUNT(*) FROM listings WHERE ip = ? AND created > ?",
                         (ip, int(time.time()) - 3600)).fetchone()[0]
    if recent >= PER_IP_PER_HOUR:
        return err("Слишком много объявлений за час. Попробуйте позже.", 429, "rate_limit")
    if banned(con, user_hash()):
        return err("Доступ ограничен администратором", 403, "banned")

    cat = f.get("cat")
    title = clean(f.get("title"), 80)
    price = to_int(f.get("price"), 0, MAX_PRICE)
    city = f.get("city") or ""
    phone = clean(f.get("phone"), 20)
    if cat not in CATS:
        return err("Выберите категорию", code="cat")
    bad = check_fields(title, price, city, phone)
    if bad:
        return bad

    # Фото необязательны: без них на сайте показывается логотип SystemMarket.
    files = [x for x in request.files.getlist("photos") if x and x.filename][:MAX_PHOTOS]
    names = []
    try:
        for fs in files:
            names.append(save_photo(fs))
    except ValueError as e:
        delete_photo_files(names)
        return err(str(e), code="photo_bad")

    lid = secrets.token_hex(6)
    token = secrets.token_urlsafe(24)
    now = int(time.time())
    con.execute(
        "INSERT INTO listings (id, cat, title, price, city, descr, name, phone, extra, photos, token_hash, ip,"
        " created, updated, owner_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (lid, cat, title, price, city, clean(f.get("desc"), 3000), clean(f.get("name"), 30) or "Продавец",
         phone, json.dumps(parse_extra(cat, f), ensure_ascii=False), json.dumps(names), sha(token), ip,
         now, now, user_hash() or ""),
    )
    con.commit()
    return {"id": lid, "token": token}, 201


@app.put("/api/listings/<lid>")
def update_listing(lid):
    """Редактирование своего объявления (или любого — с ключом администратора)."""
    con = db()
    row = con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone()
    if not row:
        return err("Объявление не найдено", 404, "not_found")
    if not edit_rights(row):
        return err("Нет прав на изменение", 403, "forbidden")
    d = request.get_json(silent=True)
    if not isinstance(d, dict):
        d = request.form.to_dict()

    title = clean(d["title"], 80) if "title" in d else row["title"]
    price = to_int(d["price"], 0, MAX_PRICE) if "price" in d else row["price"]
    city = d["city"] if "city" in d else row["city"]
    phone = clean(d["phone"], 20) if "phone" in d else row["phone"]
    bad = check_fields(title, price, city, phone)
    if bad:
        return bad
    descr = clean(d["desc"], 3000) if "desc" in d else row["descr"]
    name = (clean(d["name"], 30) or "Продавец") if "name" in d else row["name"]
    sold = (1 if d["sold"] in (True, 1, "1", "true", "on") else 0) if "sold" in d else row["sold"]

    extra = json.loads(row["extra"])
    incoming = parse_extra(row["cat"], d)
    for key in EXTRA_FIELDS.get(row["cat"], ()):
        if key in d:
            extra[key] = incoming[key]

    con.execute(
        "UPDATE listings SET title = ?, price = ?, city = ?, descr = ?, name = ?, phone = ?, extra = ?,"
        " sold = ?, updated = ? WHERE id = ?",
        (title, price, city, descr, name, phone, json.dumps(extra, ensure_ascii=False), sold,
         int(time.time()), lid),
    )
    con.commit()
    return public(con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone())


@app.delete("/api/listings/<lid>")
def delete_listing(lid):
    con = db()
    row = con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone()
    if not row:
        return err("Объявление не найдено", 404, "not_found")
    if not edit_rights(row):
        return err("Нет прав на удаление", 403, "forbidden")
    media = delete_conversations(con, [r[0] for r in con.execute("SELECT id FROM conversations WHERE listing_id = ?", (lid,))])
    con.execute("DELETE FROM listings WHERE id = ?", (lid,))
    con.commit()
    delete_photo_files(json.loads(row["photos"]))
    delete_media(media)
    return {"ok": True}


# ---------------------------------------------------------------- чат
def chat_limit_hit(con, ip):
    n = con.execute("SELECT COUNT(*) FROM messages WHERE ip = ? AND created > ?",
                    (ip, int(time.time()) - 60)).fetchone()[0]
    return n >= CHAT_MSG_PER_MIN


CONV_SELECT = ("SELECT c.*, l.title, l.price, l.photos, l.sold, l.name AS seller_name, l.owner_hash"
               " FROM conversations c JOIN listings l ON l.id = c.listing_id")


def conv_row(con, cid, me):
    """Диалог + объявление, если текущий посетитель в нём участвует. Иначе None."""
    if not re.fullmatch(r"[a-f0-9]{16}", cid or ""):
        return None
    row = con.execute(CONV_SELECT + " WHERE c.id = ?", (cid,)).fetchone()
    if row is None or me not in (row["buyer_hash"], row["owner_hash"]):
        return None
    return row


def thumb_of(photos_json):
    photos = json.loads(photos_json)
    return photo_urls(photos[:1])[0]["thumb"] if photos else ""


def conv_public(row, me):
    role = "buyer" if row["buyer_hash"] == me else "seller"
    return {
        "id": row["id"], "role": role,
        "unread": row["buyer_unread"] if role == "buyer" else row["seller_unread"],
        "updated": row["updated"], "last_text": row["last_text"], "last_kind": row["last_kind"],
        "last_mine": row["last_sender"] == role,
        "other_name": row["seller_name"] if role == "buyer" else row["buyer_name"],
        "listing": {"id": row["listing_id"], "title": row["title"], "price": row["price"], "sold": bool(row["sold"]),
                    "thumb": thumb_of(row["photos"])},
    }


def msg_public(m, mine):
    d = {"id": m["id"], "mine": mine, "text": m["body"], "kind": m["kind"], "created": m["created"]}
    if m["media"]:
        d["url"] = "/chat-media/" + m["media"]
        d["meta"] = json.loads(m["meta"] or "{}")
    return d


def add_message(con, conv, sender, body, ip, media=None):
    now = int(time.time())
    kind, fname, meta, size = media or ("text", "", {}, 0)
    cur = con.execute(
        "INSERT INTO messages (conv_id, sender, body, kind, media, meta, media_size, created, ip)"
        " VALUES (?,?,?,?,?,?,?,?,?)", (conv["id"], sender, body, kind, fname, json.dumps(meta), size, now, ip))
    other = "seller_unread" if sender == "buyer" else "buyer_unread"
    con.execute(f"UPDATE conversations SET updated = ?, last_text = ?, last_kind = ?, last_sender = ?, {other} = {other} + 1"
                " WHERE id = ?", (now, body[:140], kind, sender, conv["id"]))
    return cur.lastrowid


def refresh_last(con, cid):
    """После удаления сообщения — обновить «последнее сообщение» диалога."""
    m = con.execute("SELECT * FROM messages WHERE conv_id = ? ORDER BY id DESC LIMIT 1", (cid,)).fetchone()
    if m is None:
        con.execute("UPDATE conversations SET last_text = '', last_kind = 'text', last_sender = '' WHERE id = ?", (cid,))
    else:
        con.execute("UPDATE conversations SET last_text = ?, last_kind = ?, last_sender = ? WHERE id = ?",
                    (m["body"][:140], m["kind"], m["sender"], cid))


def delete_conversations(con, ids):
    """Удаляет диалоги и сообщения. Возвращает имена файлов — удалить их после commit()."""
    ids = list(ids)
    if not ids:
        return []
    q = ",".join("?" * len(ids))
    names = [r[0] for r in con.execute(f"SELECT media FROM messages WHERE conv_id IN ({q}) AND media <> ''", ids)]
    con.execute(f"DELETE FROM messages WHERE conv_id IN ({q})", ids)
    con.execute(f"DELETE FROM conversations WHERE id IN ({q})", ids)
    return names


# ---------------------------------------------------------------- фото, видео и голосовые в переписке
class MediaError(Exception):
    STATUS = {"media_big": 413, "media_bad": 400, "media_quota": 429, "disk_full": 507}

    def __init__(self, code, msg):
        super().__init__(msg)
        self.code = code


def media_error(e):
    return err(str(e), MediaError.STATUS.get(e.code, 400), e.code)


def sniff(head):
    """Тип файла по первым байтам (расширению и заявленному типу не верим)."""
    if head[:3] == b"\xff\xd8\xff":
        return "jpeg"
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return "webm" if b"webm" in head[:64] else None
    if head[:4] == b"OggS":
        return "ogg"
    if head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand == b"qt  ":
            return "mov"
        if brand[:3] in (b"M4A", b"M4B"):
            return "m4a"
        return "mp4"
    if head[:3] == b"ID3" or (len(head) > 1 and head[0] == 0xFF and head[1] & 0xE0 == 0xE0):
        return "mp3"
    return None


def file_size(fs):
    s = fs.stream
    s.seek(0, os.SEEK_END)
    n = s.tell()
    s.seek(0)
    return n


def media_quota_left(con, ip):
    since = int(time.time()) - 86400
    used = 0
    for table in ("messages", "support_messages"):
        used += con.execute(f"SELECT COALESCE(SUM(media_size), 0) FROM {table} WHERE ip = ? AND created > ?",
                            (ip, since)).fetchone()[0]
    return MEDIA_DAY_BYTES - used


def store_media(con, fs, kind, dur, ip):
    """Проверяет и сохраняет файл. Возвращает (kind, имя файла, meta, размер).
    Фото пересохраняются (без EXIF/GPS), видео и голосовые — как есть, но только известных форматов."""
    size = file_size(fs)
    if size == 0:
        raise MediaError("media_bad", "Пустой файл")
    if size > media_quota_left(con, ip):
        raise MediaError("media_quota", "Слишком много файлов за сутки. Попробуйте завтра.")
    if shutil.disk_usage(CHAT_DIR).free - size < MIN_FREE_BYTES:
        raise MediaError("disk_full", "На сервере закончилось место")
    fmt = sniff(fs.stream.read(64))
    fs.stream.seek(0)
    name = secrets.token_hex(12)

    if fmt in ("jpeg", "png", "webp", "gif"):
        if size > IMAGE_MAX:
            raise MediaError("media_big", "Фото больше 15 МБ")
        try:
            img = Image.open(fs.stream)
            img.draft("RGB", (MAX_SIDE, MAX_SIDE))
            img = ImageOps.exif_transpose(img).convert("RGB")
            img.thumbnail((MAX_SIDE, MAX_SIDE))
        except Exception:
            raise MediaError("media_bad", "Не удалось прочитать фото")
        fname = name + ".jpg"
        path = os.path.join(CHAT_DIR, fname)
        img.save(path + ".part", "JPEG", quality=82, optimize=True, progressive=True)
        os.replace(path + ".part", path)
        return "image", fname, {"w": img.width, "h": img.height}, os.path.getsize(path)

    if kind == "audio" and fmt in ("webm", "ogg", "m4a", "mp4", "mp3"):
        kind, ext = "audio", {"webm": "weba", "ogg": "ogg", "m4a": "m4a", "mp4": "m4a", "mp3": "mp3"}[fmt]
    elif fmt in ("mp4", "mov", "webm"):
        kind, ext = "video", fmt
    elif fmt in ("m4a", "ogg", "mp3"):
        kind, ext = "audio", "m4a" if fmt == "m4a" else fmt
    else:
        raise MediaError("media_bad", "Этот файл не подходит: только фото, видео или голосовое")
    limit = AUDIO_MAX if kind == "audio" else VIDEO_MAX
    if size > limit:
        raise MediaError("media_big", "Файл слишком большой")
    fname = name + "." + ext
    path = os.path.join(CHAT_DIR, fname)
    fs.save(path + ".part")
    os.replace(path + ".part", path)
    return kind, fname, ({"dur": dur} if dur else {}), size


def delete_media(names):
    for n in names:
        if n and MEDIA_NAME_RE.fullmatch(n):
            try:
                os.remove(os.path.join(CHAT_DIR, n))
            except FileNotFoundError:
                pass


def message_input():
    """Сообщение из запроса: JSON {text, ...} или форма (text, file, kind, dur, ...).
    Возвращает (поля, текст, файл или None, заявленный тип, длительность)."""
    if request.mimetype == "multipart/form-data":
        f = request.form
        fs = request.files.get("file")
        if fs is not None and not fs.filename:
            fs = None
        return f, clean(f.get("text"), CHAT_MAX_LEN), fs, f.get("kind", ""), to_int(f.get("dur"), 0, 3600) or 0
    d = request.get_json(silent=True)
    d = d if isinstance(d, dict) else {}
    return d, clean(d.get("text"), CHAT_MAX_LEN), None, "", 0


# ---------------------------------------------------------------- переписка покупатель ↔ продавец
@app.post("/api/me/claim")
def claim_listings():
    """Привязать свои старые объявления (по ключам редактирования) к посетителю — чтобы видеть их чаты."""
    me = user_hash()
    if not me:
        return err("Нет ключа устройства", 401, "no_user")
    d = request.get_json(silent=True) or {}
    items = d.get("items") if isinstance(d.get("items"), list) else []
    con, claimed = db(), 0
    for it in items[:100]:
        if not isinstance(it, dict):
            continue
        lid, token = str(it.get("id", "")), str(it.get("token", ""))
        row = con.execute("SELECT token_hash, owner_hash FROM listings WHERE id = ?", (lid,)).fetchone()
        if row and not row["owner_hash"] and token and hmac.compare_digest(sha(token), row["token_hash"]):
            con.execute("UPDATE listings SET owner_hash = ? WHERE id = ?", (me, lid))
            claimed += 1
    con.commit()
    return {"claimed": claimed}


@app.post("/api/chats")
def start_chat():
    """Покупатель пишет продавцу: создаёт диалог по объявлению (или продолжает существующий)."""
    me = user_hash()
    if not me:
        return err("Нет ключа устройства", 401, "no_user")
    fields, body, fs, kind, dur = message_input()
    if not body and fs is None:
        return err("Пустое сообщение", code="empty")
    con, ip = db(), client_ip()
    if banned(con, me):
        return err("Доступ ограничен администратором", 403, "banned")
    lst = con.execute("SELECT id, owner_hash FROM listings WHERE id = ?", (str(fields.get("listing_id", "")),)).fetchone()
    if not lst:
        return err("Объявление не найдено", 404, "not_found")
    if lst["owner_hash"] == me:
        return err("Это ваше объявление", code="own_listing")
    if chat_limit_hit(con, ip):
        return err("Слишком много сообщений", 429, "rate_limit_chat")
    conv = con.execute("SELECT * FROM conversations WHERE listing_id = ? AND buyer_hash = ?", (lst["id"], me)).fetchone()
    if conv is None:
        recent = con.execute(
            "SELECT COUNT(*) FROM conversations c JOIN messages m ON m.conv_id = c.id AND m.id ="
            " (SELECT MIN(id) FROM messages WHERE conv_id = c.id) WHERE m.ip = ? AND c.created > ?",
            (ip, int(time.time()) - 3600)).fetchone()[0]
        if recent >= CHAT_NEW_PER_HOUR:
            return err("Слишком много новых диалогов", 429, "rate_limit_chat")
    media = None
    if fs is not None:
        try:
            media = store_media(con, fs, kind, dur, ip)
        except MediaError as e:
            return media_error(e)
    name = clean(fields.get("name"), 30)
    u = current_user()
    if not name and u is not None:
        name = u["name"][:30]
    if conv is None:
        cid, now = secrets.token_hex(8), int(time.time())
        con.execute("INSERT INTO conversations (id, listing_id, buyer_hash, buyer_name, created, updated)"
                    " VALUES (?,?,?,?,?,?)", (cid, lst["id"], me, name, now, now))
        conv = con.execute("SELECT * FROM conversations WHERE id = ?", (cid,)).fetchone()
    elif name:
        con.execute("UPDATE conversations SET buyer_name = ? WHERE id = ?", (name, conv["id"]))
    add_message(con, conv, "buyer", body, ip, media)
    con.commit()
    return {"conv": conv_public(conv_row(con, conv["id"], me), me)}, 201


def support_unread_of(con, me):
    t = con.execute("SELECT user_unread FROM support_threads WHERE owner = ?", (me,)).fetchone()
    return t["user_unread"] if t else 0


@app.get("/api/chats")
def list_chats():
    me = user_hash()
    if not me:
        return {"items": [], "unread": 0, "support": None}
    con = db()
    rows = con.execute(CONV_SELECT + " WHERE c.buyer_hash = ? OR l.owner_hash = ? ORDER BY c.updated DESC LIMIT 100",
                       (me, me)).fetchall()
    items = [conv_public(r, me) for r in rows]
    t = con.execute("SELECT * FROM support_threads WHERE owner = ?", (me,)).fetchone()
    support = support_public(t) if t else None
    return {"items": items, "unread": sum(i["unread"] for i in items) + (support["unread"] if support else 0),
            "support": support}


@app.get("/api/chats/unread")
def chats_unread():
    me = user_hash()
    if not me:
        return {"unread": 0}
    con = db()
    n = con.execute(
        "SELECT COALESCE(SUM(CASE WHEN c.buyer_hash = ? THEN c.buyer_unread ELSE c.seller_unread END), 0)"
        " FROM conversations c JOIN listings l ON l.id = c.listing_id"
        " WHERE c.buyer_hash = ? OR l.owner_hash = ?", (me, me, me)).fetchone()[0]
    return {"unread": n + support_unread_of(con, me)}


@app.get("/api/chats/<cid>/messages")
def chat_messages(cid):
    me = user_hash()
    con = db()
    row = conv_row(con, cid, me) if me else None
    if row is None:
        return err("Диалог не найден", 404, "not_found")
    role = "buyer" if row["buyer_hash"] == me else "seller"
    after = to_int(request.args.get("after", 0), 0, 10**12) or 0
    msgs = con.execute("SELECT * FROM (SELECT * FROM messages WHERE conv_id = ? AND id > ? ORDER BY id DESC LIMIT 300)"
                       " ORDER BY id", (cid, after)).fetchall()
    mine_unread = "buyer_unread" if role == "buyer" else "seller_unread"
    if row[mine_unread]:
        con.execute(f"UPDATE conversations SET {mine_unread} = 0 WHERE id = ?", (cid,))
        con.commit()
    return {"conv": conv_public(row, me), "messages": [msg_public(m, m["sender"] == role) for m in msgs]}


@app.post("/api/chats/<cid>/messages")
def chat_send(cid):
    me = user_hash()
    con = db()
    row = conv_row(con, cid, me) if me else None
    if row is None:
        return err("Диалог не найден", 404, "not_found")
    _fields, body, fs, kind, dur = message_input()
    if not body and fs is None:
        return err("Пустое сообщение", code="empty")
    if banned(con, me):
        return err("Доступ ограничен администратором", 403, "banned")
    ip = client_ip()
    if chat_limit_hit(con, ip):
        return err("Слишком много сообщений", 429, "rate_limit_chat")
    media = None
    if fs is not None:
        try:
            media = store_media(con, fs, kind, dur, ip)
        except MediaError as e:
            return media_error(e)
    role = "buyer" if row["buyer_hash"] == me else "seller"
    mid = add_message(con, row, role, body, ip, media)
    con.commit()
    return {"message": msg_public(con.execute("SELECT * FROM messages WHERE id = ?", (mid,)).fetchone(), True)}, 201


# ---------------------------------------------------------------- сообщения администратору
SUPPORT_PER_10MIN = 8        # сообщений администратору за 10 минут с одного IP
SUPPORT_NEW_PER_HOUR = 5     # новых обращений в час с одного IP


def support_public(t):
    return {"id": t["id"], "unread": t["user_unread"], "updated": t["updated"], "last_text": t["last_text"],
            "last_kind": t["last_kind"], "last_mine": t["last_sender"] == "user"}


def add_support_message(con, thread, sender, body, ip, media=None):
    now = int(time.time())
    kind, fname, meta, size = media or ("text", "", {}, 0)
    cur = con.execute(
        "INSERT INTO support_messages (thread_id, sender, body, kind, media, meta, media_size, created, ip)"
        " VALUES (?,?,?,?,?,?,?,?,?)", (thread["id"], sender, body, kind, fname, json.dumps(meta), size, now, ip))
    unread = "admin_unread" if sender == "user" else "user_unread"
    con.execute(f"UPDATE support_threads SET updated = ?, last_text = ?, last_kind = ?, last_sender = ?,"
                f" {unread} = {unread} + 1 WHERE id = ?", (now, body[:140], kind, sender, thread["id"]))
    return cur.lastrowid


@app.get("/api/support")
def support_get():
    me = user_hash()
    if not me:
        return {"thread": None, "messages": []}
    con = db()
    t = con.execute("SELECT * FROM support_threads WHERE owner = ?", (me,)).fetchone()
    if t is None:
        return {"thread": None, "messages": []}
    after = to_int(request.args.get("after", 0), 0, 10**12) or 0
    rows = con.execute("SELECT * FROM (SELECT * FROM support_messages WHERE thread_id = ? AND id > ? ORDER BY id DESC"
                       " LIMIT 300) ORDER BY id", (t["id"], after)).fetchall()
    if t["user_unread"]:
        con.execute("UPDATE support_threads SET user_unread = 0 WHERE id = ?", (t["id"],))
        con.commit()
    return {"thread": support_public(t), "messages": [msg_public(m, m["sender"] == "user") for m in rows]}


@app.post("/api/support")
def support_send():
    me = user_hash()
    if not me:
        return err("Нет ключа устройства", 401, "no_user")
    fields, body, fs, kind, dur = message_input()
    if not body and fs is None:
        return err("Пустое сообщение", code="empty")
    con, ip, now = db(), client_ip(), int(time.time())
    n = con.execute("SELECT COUNT(*) FROM support_messages WHERE ip = ? AND sender = 'user' AND created > ?",
                    (ip, now - 600)).fetchone()[0]
    if n >= SUPPORT_PER_10MIN:
        return err("Слишком много сообщений", 429, "rate_limit_chat")
    t = con.execute("SELECT * FROM support_threads WHERE owner = ?", (me,)).fetchone()
    if t is None and con.execute("SELECT COUNT(*) FROM support_threads WHERE ip = ? AND created > ?",
                                 (ip, now - 3600)).fetchone()[0] >= SUPPORT_NEW_PER_HOUR:
        return err("Слишком много сообщений", 429, "rate_limit_chat")
    media = None
    if fs is not None:
        try:
            media = store_media(con, fs, kind, dur, ip)
        except MediaError as e:
            return media_error(e)
    u = current_user()
    name = u["name"][:60] if u is not None else clean(fields.get("name"), 60)
    lang = fields.get("lang") if fields.get("lang") in ("ru", "tr", "tk") else ""
    ua = clean(request.headers.get("User-Agent"), 200)
    if t is None:
        con.execute("INSERT INTO support_threads (id, owner, user_id, name, lang, created, updated, ip, ua)"
                    " VALUES (?,?,?,?,?,?,?,?,?)",
                    (secrets.token_hex(8), me, u["id"] if u is not None else None, name, lang, now, now, ip, ua))
        t = con.execute("SELECT * FROM support_threads WHERE owner = ?", (me,)).fetchone()
    else:
        con.execute("UPDATE support_threads SET name = CASE WHEN ? <> '' THEN ? ELSE name END,"
                    " lang = CASE WHEN ? <> '' THEN ? ELSE lang END, ip = ?, ua = ? WHERE id = ?",
                    (name, name, lang, lang, ip, ua, t["id"]))
    mid = add_support_message(con, t, "user", body, ip, media)
    con.commit()
    m = con.execute("SELECT * FROM support_messages WHERE id = ?", (mid,)).fetchone()
    t = con.execute("SELECT * FROM support_threads WHERE id = ?", (t["id"],)).fetchone()
    return {"message": msg_public(m, True), "thread": support_public(t)}, 201


# ---------------------------------------------------------------- вход через Google
def get_settings(con=None):
    con = con or db()
    return {r[0]: r[1] for r in con.execute("SELECT key, value FROM settings")}


def set_setting(con, key, value):
    con.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, str(value)))


def google_enabled(s):
    return bool(s.get("google_client_id") and s.get("google_client_secret"))


def site_base():
    base = os.environ.get("SM_SITE_URL", "").rstrip("/")
    if base:
        return base
    return "%s://%s" % (request.headers.get("X-Forwarded-Proto") or request.scheme, request.host)


def redirect_uri():
    return site_base() + "/auth/google/callback"


def safe_next(value):
    value = (value or "").strip()
    if not value.startswith("/") or value.startswith("//") or "\\" in value or len(value) > 200:
        return "/#/profile"
    return value


def user_public(u):
    return {"name": u["name"], "email": u["email"], "picture": u["picture"], "created": u["created"]}


def merge_device(con, dev, acct):
    """После входа через Google объявления и переписка этого браузера переходят в аккаунт —
    и становятся видны на всех устройствах, где человек вошёл."""
    if not dev or dev == acct:
        return
    changed = con.execute("UPDATE listings SET owner_hash = ? WHERE owner_hash = ?", (acct, dev)).rowcount
    for c in con.execute("SELECT * FROM conversations WHERE buyer_hash = ?", (dev,)).fetchall():
        other = con.execute("SELECT id FROM conversations WHERE listing_id = ? AND buyer_hash = ?",
                            (c["listing_id"], acct)).fetchone()
        if other is None:
            con.execute("UPDATE conversations SET buyer_hash = ? WHERE id = ?", (acct, c["id"]))
        else:
            con.execute("UPDATE messages SET conv_id = ? WHERE conv_id = ?", (other["id"], c["id"]))
            con.execute("UPDATE conversations SET buyer_unread = buyer_unread + ?, seller_unread = seller_unread + ?,"
                        " updated = MAX(updated, ?) WHERE id = ?",
                        (c["buyer_unread"], c["seller_unread"], c["updated"], other["id"]))
            refresh_last(con, other["id"])
            con.execute("DELETE FROM conversations WHERE id = ?", (c["id"],))
        changed += 1
    # человек писал по собственному объявлению с другого браузера — такая «переписка с собой» не нужна
    self_chats = [r[0] for r in con.execute(
        "SELECT c.id FROM conversations c JOIN listings l ON l.id = c.listing_id WHERE c.buyer_hash = l.owner_hash")]
    names = delete_conversations(con, self_chats)
    old = con.execute("SELECT * FROM support_threads WHERE owner = ?", (dev,)).fetchone()
    if old is not None:
        mine = con.execute("SELECT * FROM support_threads WHERE owner = ?", (acct,)).fetchone()
        if mine is None:
            con.execute("UPDATE support_threads SET owner = ? WHERE id = ?", (acct, old["id"]))
        else:
            con.execute("UPDATE support_messages SET thread_id = ? WHERE thread_id = ?", (mine["id"], old["id"]))
            last = con.execute("SELECT * FROM support_messages WHERE thread_id = ? ORDER BY id DESC LIMIT 1",
                               (mine["id"],)).fetchone()
            con.execute("UPDATE support_threads SET admin_unread = admin_unread + ?, user_unread = user_unread + ?,"
                        " updated = ?, last_text = ?, last_kind = ?, last_sender = ? WHERE id = ?",
                        (old["admin_unread"], old["user_unread"], max(mine["updated"], old["updated"]),
                         last["body"][:140], last["kind"], last["sender"], mine["id"]))
            con.execute("DELETE FROM support_threads WHERE id = ?", (old["id"],))
        changed += 1
    if changed or names:
        con.commit()
        delete_media(names)


@app.get("/api/me")
def me_info():
    con = db()
    u = current_user()
    dev = device_hash()
    if u is not None and dev:
        merge_device(con, dev, account_hash(u["id"]))
    return {"google": google_enabled(get_settings(con)), "user": user_public(u) if u is not None else None}


@app.get("/api/me/listings")
def my_listings():
    me = user_hash()
    if not me:
        return {"items": []}
    con = db()
    rows = con.execute("SELECT * FROM listings WHERE owner_hash = ? ORDER BY created DESC LIMIT 100", (me,)).fetchall()
    chats = dict(con.execute(
        "SELECT c.listing_id, COUNT(*) FROM conversations c JOIN listings l ON l.id = c.listing_id"
        " WHERE l.owner_hash = ? GROUP BY c.listing_id", (me,)).fetchall())
    items = []
    for r in rows:
        x = public(r)
        x["chats"] = chats.get(r["id"], 0)        # сколько покупателей написали по объявлению
        items.append(x)
    return {"items": items}


@app.get("/auth/google")
def auth_google():
    s = get_settings()
    if not google_enabled(s):
        return redirect("/#/profile")
    url, pending = oauth.start(s["google_client_id"], redirect_uri())
    pending["next"] = safe_next(request.args.get("next"))
    pending["app"] = request.args.get("app") == "1"     # вход начат в приложении Android
    session["oauth"] = pending
    return redirect(url)


@app.get("/auth/google/callback")
def auth_google_callback():
    s = get_settings()
    pending = session.pop("oauth", None)
    if not google_enabled(s):
        return redirect("/#/profile")
    if request.args.get("error") or not pending:
        return redirect("/#/profile?login=cancel")
    state, code = request.args.get("state", ""), request.args.get("code", "")
    if not code or not hmac.compare_digest(state.encode(), str(pending.get("state", "")).encode()):
        return redirect("/#/profile?login=fail")
    try:
        info = oauth.finish(s["google_client_id"], s["google_client_secret"], redirect_uri(), code, pending)
    except oauth.OAuthError:
        return redirect("/#/profile?login=fail")
    con, now, ip = db(), int(time.time()), client_ip()
    row = con.execute("SELECT id, blocked FROM users WHERE google_sub = ?", (info["sub"],)).fetchone()
    if row is not None and row["blocked"]:
        return redirect("/#/profile?login=blocked")
    if row is not None:
        con.execute("UPDATE users SET email = ?, name = ?, picture = ?, logins = logins + 1, last_login = ?, last_ip = ?"
                    " WHERE id = ?", (info["email"], info["name"], info["picture"], now, ip, row["id"]))
        uid = row["id"]
    else:
        uid = con.execute("INSERT INTO users (google_sub, email, name, picture, logins, created, last_login, last_ip)"
                          " VALUES (?,?,?,?,1,?,?,?)",
                          (info["sub"], info["email"], info["name"], info["picture"], now, now, ip)).lastrowid
    con.commit()
    if pending.get("app"):
        # Google не разрешает вход внутри WebView, поэтому приложение открыло браузер.
        # Возвращаем человека в приложение с одноразовым кодом (действует 5 минут).
        code = secrets.token_urlsafe(24)
        con.execute("DELETE FROM app_codes WHERE expires < ?", (now,))
        con.execute("INSERT INTO app_codes (code_hash, uid, expires) VALUES (?,?,?)", (sha(code), uid, now + 300))
        con.commit()
        link = "intent://login?code=%s#Intent;scheme=systemmarket;package=%s;end" % (code, APP_PACKAGE)
        return APP_RETURN_HTML.replace("__LINK__", link), 200, {"Content-Type": "text/html; charset=utf-8"}
    session.clear()
    session["uid"] = uid
    session.permanent = True
    nxt = pending.get("next") or "/#/profile"
    if nxt.startswith("/#/"):
        nxt += ("&" if "?" in nxt else "?") + "login=ok"
    return redirect(nxt)


APP_RETURN_HTML = """<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>SystemMarket</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#f1f2f4;color:#0d1014}
.c{max-width:360px;margin:20px;padding:28px 22px;background:#fff;border:1px solid #dcdfe4;border-radius:8px;text-align:center}
img{width:56px;height:56px;border-radius:6px}h1{font-size:19px;margin:14px 0 6px}p{margin:0 0 18px;color:#59616d}
a{display:block;padding:14px;border-radius:4px;background:#0a7a3d;color:#fff;font-weight:800;text-decoration:none}</style></head>
<body><div class="c"><img src="/favicon.svg" alt=""><h1>Вход выполнен · Giriş edildi</h1>
<p>Вернитесь в приложение SystemMarket · Programma gaýdyň</p><a href="__LINK__">Открыть приложение · Programmany aç</a></div>
<script>setTimeout(function(){location.href=document.querySelector("a").href},300)</script></body></html>"""


@app.get("/auth/app")
def auth_app():
    """Приложение Android обменивает одноразовый код на вход (код получен после входа через Google в браузере)."""
    code = request.args.get("code", "")
    if not re.fullmatch(r"[A-Za-z0-9_-]{20,100}", code):
        return redirect("/#/profile?login=fail")
    con, now = db(), int(time.time())
    row = con.execute("SELECT uid FROM app_codes WHERE code_hash = ? AND expires > ?", (sha(code), now)).fetchone()
    con.execute("DELETE FROM app_codes WHERE code_hash = ? OR expires < ?", (sha(code), now))
    con.commit()
    if row is None:
        return redirect("/#/profile?login=fail")
    u = con.execute("SELECT blocked FROM users WHERE id = ?", (row["uid"],)).fetchone()
    if u is None or u["blocked"]:
        return redirect("/#/profile?login=blocked")
    session.clear()
    session["uid"] = row["uid"]
    session.permanent = True
    return redirect("/#/profile?login=ok")


@app.post("/auth/logout")
def auth_logout():
    if not device_hash():           # только со страниц сайта (заголовок ставит наш скрипт)
        return err("Нет ключа устройства", 401, "no_user")
    session.pop("uid", None)
    return {"ok": True}


# ---------------------------------------------------------------- админка
def admin_only(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not is_admin():
            return err("Нужен ключ администратора", 401, "forbidden")
        return fn(*args, **kwargs)
    return wrapper


@app.get("/api/admin/check")
def admin_check():
    return {"admin": is_admin()}


def admin_conv(r, bans):
    return {
        "id": r["id"], "created": r["created"], "updated": r["updated"], "count": r["cnt"],
        "last_text": r["last_text"], "last_kind": r["last_kind"], "last_sender": r["last_sender"],
        "buyer_name": r["buyer_name"], "seller_name": r["seller_name"],
        "buyer_banned": r["buyer_hash"] in bans, "seller_banned": bool(r["owner_hash"]) and r["owner_hash"] in bans,
        "listing": {"id": r["listing_id"], "title": r["title"], "price": r["price"], "sold": bool(r["sold"]),
                    "thumb": thumb_of(r["photos"])},
    }


def ban_set(con):
    return {r[0] for r in con.execute("SELECT hash FROM bans")}


@app.get("/api/admin/overview")
@admin_only
def admin_overview():
    con = db()
    one = lambda sql: con.execute(sql).fetchone()[0]
    s = get_settings(con)
    return {
        "stats": {
            "listings": one("SELECT COUNT(*) FROM listings"), "chats": one("SELECT COUNT(*) FROM conversations"),
            "messages": one("SELECT COUNT(*) FROM messages"), "users": one("SELECT COUNT(*) FROM users"),
            "support_unread": one("SELECT COALESCE(SUM(admin_unread), 0) FROM support_threads"),
            "media_mb": round(one("SELECT COALESCE(SUM(media_size), 0) FROM messages") / 1048576, 1),
            "disk_free_gb": round(shutil.disk_usage(CHAT_DIR).free / 1073741824, 1),
        },
        "google": {"client_id": s.get("google_client_id", ""), "has_secret": bool(s.get("google_client_secret")),
                   "enabled": google_enabled(s), "redirect_uri": redirect_uri()},
    }


@app.get("/api/admin/chats")
@admin_only
def admin_chats():
    con = db()
    rows = con.execute(CONV_SELECT.replace("SELECT c.*,", "SELECT c.*, (SELECT COUNT(*) FROM messages m"
                                           " WHERE m.conv_id = c.id) AS cnt,")
                       + " ORDER BY c.updated DESC LIMIT 500").fetchall()
    bans = ban_set(con)
    return {"items": [admin_conv(r, bans) for r in rows]}


@app.get("/api/admin/chats/<cid>")
@admin_only
def admin_chat(cid):
    con = db()
    r = con.execute(CONV_SELECT.replace("SELECT c.*,", "SELECT c.*, (SELECT COUNT(*) FROM messages m"
                                        " WHERE m.conv_id = c.id) AS cnt,") + " WHERE c.id = ?", (cid,)).fetchone()
    if r is None:
        return err("Диалог не найден", 404, "not_found")
    msgs = con.execute("SELECT * FROM messages WHERE conv_id = ? ORDER BY id", (cid,)).fetchall()
    return {"conv": admin_conv(r, ban_set(con)),
            "messages": [dict(msg_public(m, False), sender=m["sender"], ip=m["ip"]) for m in msgs]}


@app.delete("/api/admin/chats/<cid>")
@admin_only
def admin_chat_delete(cid):
    con = db()
    names = delete_conversations(con, [cid])
    con.commit()
    delete_media(names)
    return {"ok": True}


@app.delete("/api/admin/messages/<int:mid>")
@admin_only
def admin_message_delete(mid):
    con = db()
    m = con.execute("SELECT conv_id, media FROM messages WHERE id = ?", (mid,)).fetchone()
    if m is None:
        return err("Сообщение не найдено", 404, "not_found")
    con.execute("DELETE FROM messages WHERE id = ?", (mid,))
    refresh_last(con, m["conv_id"])
    con.commit()
    delete_media([m["media"]])
    return {"ok": True}


@app.post("/api/admin/chats/<cid>/ban")
@admin_only
def admin_ban(cid):
    """Заблокировать (или разблокировать) покупателя или продавца из диалога."""
    d = request.get_json(silent=True) or {}
    con = db()
    r = con.execute(CONV_SELECT + " WHERE c.id = ?", (cid,)).fetchone()
    if r is None:
        return err("Диалог не найден", 404, "not_found")
    who = d.get("who")
    target = r["buyer_hash"] if who == "buyer" else r["owner_hash"] if who == "seller" else ""
    if not target:
        return err("Этого участника нельзя заблокировать", code="bad_request")
    if d.get("on", True):
        name = r["buyer_name"] if who == "buyer" else r["seller_name"]
        con.execute("INSERT OR IGNORE INTO bans (hash, reason, created) VALUES (?,?,?)",
                    (target, "%s «%s» — %s" % ("Покупатель" if who == "buyer" else "Продавец", name or "без имени",
                                                r["title"][:60]), int(time.time())))
    else:
        con.execute("DELETE FROM bans WHERE hash = ?", (target,))
    con.commit()
    return {"ok": True}


@app.get("/api/admin/bans")
@admin_only
def admin_bans():
    rows = db().execute("SELECT hash, reason, created FROM bans ORDER BY created DESC").fetchall()
    return {"items": [dict(r) for r in rows]}


@app.delete("/api/admin/bans/<h>")
@admin_only
def admin_unban(h):
    con = db()
    con.execute("DELETE FROM bans WHERE hash = ?", (h,))
    con.commit()
    return {"ok": True}


def support_admin(r):
    return {"id": r["id"], "name": r["name"], "email": r["email"] or "", "lang": r["lang"], "ip": r["ip"],
            "ua": r["ua"], "created": r["created"], "updated": r["updated"], "last_text": r["last_text"],
            "last_kind": r["last_kind"], "last_sender": r["last_sender"], "unread": r["admin_unread"],
            "count": r["cnt"]}


@app.get("/api/admin/support")
@admin_only
def admin_support():
    con = db()
    rows = con.execute("SELECT t.*, u.email, (SELECT COUNT(*) FROM support_messages m WHERE m.thread_id = t.id) AS cnt"
                       " FROM support_threads t LEFT JOIN users u ON u.id = t.user_id"
                       " ORDER BY t.updated DESC LIMIT 500").fetchall()
    return {"items": [support_admin(r) for r in rows],
            "unread": con.execute("SELECT COALESCE(SUM(admin_unread), 0) FROM support_threads").fetchone()[0]}


def support_or_404(con, tid):
    if not re.fullmatch(r"[a-f0-9]{16}", tid or ""):
        return None
    return con.execute("SELECT t.*, u.email, (SELECT COUNT(*) FROM support_messages m WHERE m.thread_id = t.id) AS cnt"
                       " FROM support_threads t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ?", (tid,)).fetchone()


@app.get("/api/admin/support/<tid>")
@admin_only
def admin_support_thread(tid):
    con = db()
    t = support_or_404(con, tid)
    if t is None:
        return err("Обращение не найдено", 404, "not_found")
    if t["admin_unread"]:
        con.execute("UPDATE support_threads SET admin_unread = 0 WHERE id = ?", (tid,))
        con.commit()
    msgs = con.execute("SELECT * FROM support_messages WHERE thread_id = ? ORDER BY id", (tid,)).fetchall()
    return {"thread": support_admin(t), "messages": [msg_public(m, m["sender"] == "admin") for m in msgs]}


@app.post("/api/admin/support/<tid>")
@admin_only
def admin_support_reply(tid):
    con = db()
    t = support_or_404(con, tid)
    if t is None:
        return err("Обращение не найдено", 404, "not_found")
    _fields, body, fs, kind, dur = message_input()
    if not body and fs is None:
        return err("Пустое сообщение", code="empty")
    media = None
    if fs is not None:
        try:
            media = store_media(con, fs, kind, dur, "admin")
        except MediaError as e:
            return media_error(e)
    mid = add_support_message(con, t, "admin", body, "admin", media)
    con.execute("UPDATE support_threads SET admin_unread = 0 WHERE id = ?", (tid,))
    con.commit()
    return {"message": msg_public(con.execute("SELECT * FROM support_messages WHERE id = ?", (mid,)).fetchone(), True)}, 201


@app.delete("/api/admin/support/<tid>")
@admin_only
def admin_support_delete(tid):
    con = db()
    names = [r[0] for r in con.execute("SELECT media FROM support_messages WHERE thread_id = ? AND media <> ''", (tid,))]
    con.execute("DELETE FROM support_messages WHERE thread_id = ?", (tid,))
    con.execute("DELETE FROM support_threads WHERE id = ?", (tid,))
    con.commit()
    delete_media(names)
    return {"ok": True}


@app.get("/api/admin/users")
@admin_only
def admin_users():
    rows = db().execute("SELECT * FROM users ORDER BY last_login DESC LIMIT 500").fetchall()
    return {"items": [{"id": r["id"], "name": r["name"], "email": r["email"], "picture": r["picture"],
                       "blocked": bool(r["blocked"]), "logins": r["logins"], "created": r["created"],
                       "last_login": r["last_login"]} for r in rows]}


@app.post("/api/admin/users/<int:uid>/block")
@admin_only
def admin_user_block(uid):
    blocked = bool((request.get_json(silent=True) or {}).get("blocked"))
    con = db()
    con.execute("UPDATE users SET blocked = ? WHERE id = ?", (1 if blocked else 0, uid))
    con.commit()
    return {"ok": True}


@app.post("/api/admin/settings")
@admin_only
def admin_settings():
    d = request.get_json(silent=True) or {}
    con = db()
    cid = clean(d.get("google_client_id"), 200)
    if cid and not re.fullmatch(r"[\w.-]+\.apps\.googleusercontent\.com", cid):
        return err("Client ID должен заканчиваться на .apps.googleusercontent.com", code="bad_request")
    set_setting(con, "google_client_id", cid)
    secret = clean(d.get("google_client_secret"), 200)
    if secret:
        set_setting(con, "google_client_secret", secret)
    if not cid:
        set_setting(con, "google_client_secret", "")
    con.commit()
    return admin_overview()


@app.post("/api/admin/wipe")
@admin_only
def admin_wipe():
    """Удалить ВСЕ объявления, их фото и всю переписку покупателей с продавцами.
    Перед удалением база копируется в папку backups (фото и файлы не копируются)."""
    if (request.get_json(silent=True) or {}).get("confirm") != "DELETE":
        return err("Нужно подтверждение", code="bad_request")
    con = db()
    os.makedirs(os.path.join(DATA, "backups"), exist_ok=True)
    backup = sqlite3.connect(os.path.join(DATA, "backups", time.strftime("market-%Y%m%d-%H%M%S.db")))
    con.backup(backup)
    backup.close()
    photos = [n for r in con.execute("SELECT photos FROM listings") for n in json.loads(r[0])]
    names = delete_conversations(con, [r[0] for r in con.execute("SELECT id FROM conversations")])
    n = con.execute("DELETE FROM listings").rowcount
    con.commit()
    delete_photo_files(photos)
    delete_media(names)
    return {"ok": True, "deleted": n}


@app.errorhandler(413)
def too_large(_e):
    return err("Фото слишком большие (максимум 40 МБ за раз)", 413, "too_large")


@app.errorhandler(404)
def not_found(_e):
    if request.path.startswith("/api/"):
        return err("Не найдено", 404, "not_found")
    if DEV:
        return send_from_directory(os.path.dirname(HERE), "index.html")
    return err("Не найдено", 404, "not_found")


@app.errorhandler(405)
def not_allowed(_e):
    return err("Метод не поддерживается", 405, "bad_request")


# ---------------------------------------------------------------- dev only
if DEV:
    @app.get("/")
    def dev_index():
        return send_from_directory(os.path.dirname(HERE), "index.html")

    @app.get("/<name>")
    def dev_static(name):
        static = os.path.join(os.path.dirname(HERE), "static")
        if os.path.isfile(os.path.join(static, name)):
            return send_from_directory(static, name)
        return send_from_directory(os.path.dirname(HERE), "index.html")

    @app.get("/chat-media/<name>")
    def dev_chat_media(name):
        if not MEDIA_NAME_RE.fullmatch(name):
            abort(404)
        resp = send_from_directory(CHAT_DIR, name, mimetype=MEDIA_TYPES[name.rsplit(".", 1)[1]], conditional=True)
        resp.headers["X-Content-Type-Options"] = "nosniff"
        return resp

    @app.get("/uploads/<path:name>")
    def dev_uploads(name):
        if not re.fullmatch(r"[a-f0-9]{24}(_t)?\.jpg", name):
            abort(404)
        return send_from_directory(UPLOADS, name)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 8000)), debug=DEV)
