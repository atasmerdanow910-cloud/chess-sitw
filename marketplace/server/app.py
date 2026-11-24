"""SystemMarket API — доска объявлений (Flask + SQLite).

Запуск в продакшене: gunicorn -w 2 -b 127.0.0.1:8000 app:app (за nginx).
Локально для разработки: SM_DEV=1 python app.py — тогда Flask сам отдаёт
index.html и загруженные фото.

Ошибки возвращаются как {"error": "<текст по-русски>", "code": "<код>"} —
по коду сайт показывает сообщение на выбранном языке.
"""
import fcntl
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
PER_IP_PER_HOUR = 60           # объявлений в час с одного IP (у мобильного оператора он общий у многих)
PER_USER_PER_HOUR = 15         # объявлений в час с одного устройства
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
MEDIA_DAY_BYTES = 300 * 1024 * 1024      # файлов с одного устройства за сутки
MEDIA_IP_DAY_BYTES = 3 * 1024 * 1024 * 1024   # и с одного IP (общий IP мобильного оператора)
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
-- Уведомления: кому и что случилось. Повтор того же события (grp) сливается с непрочитанным.
CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner      TEXT NOT NULL,
    kind       TEXT NOT NULL,
    actor      TEXT NOT NULL DEFAULT '',
    text       TEXT NOT NULL DEFAULT '',
    listing_id TEXT NOT NULL DEFAULT '',
    ltitle     TEXT NOT NULL DEFAULT '',
    thumb      TEXT NOT NULL DEFAULT '',
    data       TEXT NOT NULL DEFAULT '{}',
    link       TEXT NOT NULL DEFAULT '',
    grp        TEXT NOT NULL DEFAULT '',
    cnt        INTEGER NOT NULL DEFAULT 1,
    created    INTEGER NOT NULL,
    is_read    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_notif_owner ON notifications(owner, id);
-- Кто смотрел объявление: один человек — один просмотр
CREATE TABLE IF NOT EXISTS views (
    listing_id TEXT NOT NULL,
    viewer     TEXT NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen  INTEGER NOT NULL,
    PRIMARY KEY (listing_id, viewer)
);
CREATE INDEX IF NOT EXISTS idx_views_seen ON views(listing_id, last_seen);
-- Избранное на сервере: «в избранном у N» и уведомления о снижении цены
CREATE TABLE IF NOT EXISTS favorites (
    listing_id TEXT NOT NULL,
    owner      TEXT NOT NULL,
    created    INTEGER NOT NULL,
    PRIMARY KEY (listing_id, owner)
);
CREATE INDEX IF NOT EXISTS idx_fav_owner ON favorites(owner);
-- Сохранённые поиски: уведомление о новых подходящих объявлениях
CREATE TABLE IF NOT EXISTS saved_searches (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    owner   TEXT NOT NULL,
    params  TEXT NOT NULL,
    label   TEXT NOT NULL DEFAULT '',
    created INTEGER NOT NULL,
    hits    INTEGER NOT NULL DEFAULT 0,
    UNIQUE (owner, params)
);
-- Посетители сайта по дням — для администратора
CREATE TABLE IF NOT EXISTS visits (
    visitor    TEXT NOT NULL,
    day        INTEGER NOT NULL,
    ip         TEXT NOT NULL DEFAULT '',
    ua         TEXT NOT NULL DEFAULT '',
    lang       TEXT NOT NULL DEFAULT '',
    app        INTEGER NOT NULL DEFAULT 0,
    user_id    INTEGER NOT NULL DEFAULT 0,
    first_seen INTEGER NOT NULL,
    last_seen  INTEGER NOT NULL,
    hits       INTEGER NOT NULL DEFAULT 0,
    views      INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (visitor, day)
);
CREATE INDEX IF NOT EXISTS idx_visits_seen ON visits(last_seen);
CREATE INDEX IF NOT EXISTS idx_visits_day ON visits(day);
"""

# Колонки, которых не было в первых версиях базы, — добавляются при запуске.
MIGRATIONS = {
    "listings": {
        "sold": "INTEGER NOT NULL DEFAULT 0",
        "updated": "INTEGER NOT NULL DEFAULT 0",
        "owner_hash": "TEXT NOT NULL DEFAULT ''",
        "bumped": "INTEGER NOT NULL DEFAULT 0",
        "price_old": "INTEGER NOT NULL DEFAULT 0",
        "torg": "INTEGER NOT NULL DEFAULT 0",
        "swap": "INTEGER NOT NULL DEFAULT 0",
        "credit": "INTEGER NOT NULL DEFAULT 0",
    },
    "conversations": {
        "last_kind": "TEXT NOT NULL DEFAULT 'text'",
    },
    "messages": {
        "kind": "TEXT NOT NULL DEFAULT 'text'",
        "media": "TEXT NOT NULL DEFAULT ''",
        "meta": "TEXT NOT NULL DEFAULT '{}'",
        "media_size": "INTEGER NOT NULL DEFAULT 0",
        "sender_hash": "TEXT NOT NULL DEFAULT ''",
    },
}
CHAT_MSG_PER_MIN = 20        # сообщений в минуту с одного устройства
CHAT_IP_PER_MIN = 150        # и с одного IP
CHAT_NEW_PER_HOUR = 30       # новых диалогов в час с одного устройства
CHAT_NEW_IP_PER_HOUR = 150   # и с одного IP
TZ_OFFSET = 5 * 3600         # Ашхабад, UTC+5: «сегодня» в статистике
BUMP_EVERY = 86400           # поднять объявление можно раз в сутки
VIEW_MILESTONES = (1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000)
NOTIF_KEEP = 200             # уведомлений на человека
SEARCHES_MAX = 20            # сохранённых поисков на человека
VISITS_KEEP_DAYS = 30        # посетители для администратора хранятся 30 дней
CHAT_MAX_LEN = 2000


def init_db():
    # Процессы gunicorn стартуют одновременно: настраиваем базу по очереди, иначе «database is locked».
    lock = open(os.path.join(DATA, ".init.lock"), "w")
    fcntl.flock(lock, fcntl.LOCK_EX)
    con = sqlite3.connect(DB_PATH, timeout=30)
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
        con.execute("UPDATE listings SET bumped = created WHERE bumped = 0")
        con.execute("CREATE INDEX IF NOT EXISTS idx_bumped ON listings(bumped DESC)")
        con.execute("CREATE INDEX IF NOT EXISTS idx_msg_sender ON messages(sender_hash, created)")
        con.commit()
    finally:
        con.close()
        lock.close()


init_db()


def _ulower(v):
    return v.lower() if isinstance(v, str) else v


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH, timeout=10)
        g.db.row_factory = sqlite3.Row
        g.db.create_function("ulower", 1, _ulower, deterministic=True)
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
        "bumped": row["bumped"], "price_old": row["price_old"] if row["price_old"] > row["price"] > 0 else 0,
        "torg": bool(row["torg"]), "swap": bool(row["swap"]), "credit": bool(row["credit"]),
    }


def local_day(ts):
    return (ts + TZ_OFFSET) // 86400


def day_start(ts):
    return local_day(ts) * 86400 - TZ_OFFSET


def bump_wait(row, now):
    return max(0, max(row["bumped"], row["created"]) + BUMP_EVERY - now)


def flag(v):
    return 1 if str(v).lower() in ("1", "true", "on", "yes") else 0


def viewer_hash():
    """Кто смотрит: устройство или аккаунт; без ключа — IP и браузер."""
    return user_hash() or sha("ip:" + client_ip() + (request.headers.get("User-Agent") or ""))


def listing_stats(con, row, viewer):
    lid, now = row["id"], int(time.time())
    one = lambda sql, *a: con.execute(sql, a).fetchone()[0]
    return {
        "views_today": one("SELECT COUNT(*) FROM views WHERE listing_id = ? AND last_seen >= ?", lid, day_start(now)),
        "watching": one("SELECT COUNT(*) FROM views WHERE listing_id = ? AND last_seen >= ? AND viewer <> ?", lid, now - 300, viewer),
        "favs": one("SELECT COUNT(*) FROM favorites WHERE listing_id = ?", lid),
    }


# ---------------------------------------------------------------- уведомления
def notify(con, owner, kind, link, grp="", actor="", text="", lst=None, data=None):
    """Уведомление для хеша (устройство или аккаунт). Повтор события grp сливается с непрочитанным: «3 новых сообщения»."""
    if not owner:
        return
    cnt = 1
    if grp:
        old = con.execute("SELECT id, cnt FROM notifications WHERE owner = ? AND grp = ? AND is_read = 0", (owner, grp)).fetchone()
        if old is not None:
            cnt = old["cnt"] + 1
            con.execute("DELETE FROM notifications WHERE id = ?", (old["id"],))
    con.execute(
        "INSERT INTO notifications (owner, kind, actor, text, listing_id, ltitle, thumb, data, link, grp, cnt, created)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        (owner, kind, (actor or "")[:60], (text or "")[:200], lst["id"] if lst else "", lst["title"] if lst else "",
         thumb_of(lst["photos"]) if lst else "", json.dumps(data or {}, ensure_ascii=False), link, grp, cnt, int(time.time())))
    con.execute("DELETE FROM notifications WHERE owner = ? AND id NOT IN"
                " (SELECT id FROM notifications WHERE owner = ? ORDER BY id DESC LIMIT ?)", (owner, owner, NOTIF_KEEP))


def notify_favorites(con, row, kind, data):
    """Всем, у кого объявление в избранном (кроме продавца)."""
    for (owner,) in con.execute("SELECT owner FROM favorites WHERE listing_id = ? AND owner <> ?",
                                (row["id"], row["owner_hash"] or "-")).fetchall():
        notify(con, owner, kind, "#/item/" + row["id"], grp=kind + ":" + row["id"], lst=row, data=data)


def notif_public(n):
    return {"id": n["id"], "kind": n["kind"], "actor": n["actor"], "text": n["text"], "listing_id": n["listing_id"],
            "ltitle": n["ltitle"], "thumb": n["thumb"], "data": json.loads(n["data"] or "{}"), "link": n["link"],
            "count": n["cnt"], "created": n["created"], "read": bool(n["is_read"])}


# ---------------------------------------------------------------- сохранённые поиски
def search_params(d):
    """Параметры поиска: только известные ключи в одном виде — так одинаковые поиски не дублируются."""
    d = d if isinstance(d, dict) else {}
    p = {}
    q = clean(d.get("q"), 60).lower()
    if q:
        p["q"] = q
    if d.get("cat") in CATS:
        p["cat"] = d["cat"]
    if d.get("city") in CITIES:
        p["city"] = d["city"]
    for k, hi in (("min", MAX_PRICE), ("max", MAX_PRICE), ("yfrom", 2035), ("yto", 2035), ("kmax", 5_000_000), ("rooms", 50)):
        v = to_int(d.get(k), 1, hi)
        if v:
            p[k] = v
    for k in ("brand", "gear", "fuel", "deal"):
        v = clean(d.get(k), 40)
        if v:
            p[k] = v
    for k in ("photo", "torg", "swap", "credit"):
        if flag(d.get(k)):
            p[k] = 1
    return p


def listing_matches(p, row):
    extra = json.loads(row["extra"] or "{}")
    if p.get("cat") and row["cat"] != p["cat"]:
        return False
    if p.get("city") and row["city"] != p["city"]:
        return False
    if p.get("min") and row["price"] < p["min"]:
        return False
    if p.get("max") and not 0 < row["price"] <= p["max"]:
        return False
    if p.get("photo") and row["photos"] in ("", "[]"):
        return False
    for k in ("torg", "swap", "credit"):
        if p.get(k) and not row[k]:
            return False
    for k in ("brand", "gear", "fuel", "deal"):
        if p.get(k) and extra.get(k) != p[k]:
            return False
    y, km, r = extra.get("year"), extra.get("mileage"), extra.get("rooms")
    if p.get("yfrom") and not (y and y >= p["yfrom"]):
        return False
    if p.get("yto") and not (y and y <= p["yto"]):
        return False
    if p.get("kmax") and not (km is not None and km <= p["kmax"]):
        return False
    if p.get("rooms") and not (r is not None and (r >= 4 if p["rooms"] >= 4 else r == p["rooms"])):
        return False
    if p.get("q") and p["q"] not in (row["title"] + " " + row["descr"] + " " + row["extra"]).lower():
        return False
    return True


def match_saved_searches(con, row):
    """Новое объявление: уведомить тех, кто сохранил подходящий поиск."""
    for srch in con.execute("SELECT * FROM saved_searches WHERE owner <> ? ORDER BY id DESC LIMIT 5000",
                            (row["owner_hash"] or "-",)).fetchall():
        try:
            p = json.loads(srch["params"])
        except ValueError:
            continue
        if listing_matches(p, row):
            con.execute("UPDATE saved_searches SET hits = hits + 1 WHERE id = ?", (srch["id"],))
            notify(con, srch["owner"], "match", "#/item/" + row["id"], grp="match:%d" % srch["id"], actor=srch["label"],
                   lst=row, data={"price": row["price"], "search": srch["id"]})


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
    if request.path.startswith(("/api/me", "/api/chats", "/api/support", "/api/admin", "/auth/", "/api/notifications",
                                "/api/favorites", "/api/searches", "/api/visit")):
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
    con = db()
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
    seller_of = a.get("seller_of", "")
    if seller_of:                        # другие объявления того же продавца (сам хеш наружу не отдаём)
        so = con.execute("SELECT owner_hash FROM listings WHERE id = ?", (seller_of,)).fetchone() \
            if re.fullmatch(r"[a-z0-9]{6,32}", seller_of) else None
        if not so or not so[0]:
            return {"items": [], "total": 0}
        where.append("owner_hash = ?")
        params.append(so[0])
    for key in ("torg", "swap", "credit"):
        if a.get(key) == "1":
            where.append(key + " = 1")
    for key in ("brand", "gear", "fuel", "deal"):
        v = clean(a.get(key), 40)
        if v:
            where.append("json_extract(extra, '$.%s') = ?" % key)
            params.append(v)
    for key, field, op, hi in (("yfrom", "year", ">=", 2035), ("yto", "year", "<=", 2035), ("kmax", "mileage", "<=", 5_000_000)):
        v = to_int(a.get(key), 1, hi)
        if v:
            where.append("CAST(json_extract(extra, '$.%s') AS INTEGER) %s ?" % (field, op))
            params.append(v)
    rooms = to_int(a.get("rooms"), 1, 50)
    if rooms:
        where.append("CAST(json_extract(extra, '$.rooms') AS INTEGER) " + (">= ?" if rooms >= 4 else "= ?"))
        params.append(rooms)
    ex = a.get("exclude", "")
    if re.fullmatch(r"[a-z0-9]{6,32}", ex):
        where.append("id <> ?")
        params.append(ex)
    q = clean(a.get("q"), 60).lower()
    if q:
        like = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        where.append("(ulower(title) LIKE ? ESCAPE '\\' OR ulower(descr) LIKE ? ESCAPE '\\' OR ulower(extra) LIKE ? ESCAPE '\\')")
        params += [like, like, like]
    order = {
        "cheap": "price = 0, price ASC, created DESC",
        "exp": "price DESC, created DESC",
        "popular": "views DESC, created DESC",
    }.get(a.get("sort"), "bumped DESC, created DESC")
    limit = to_int(a.get("limit", 24), 1, PAGE_MAX) or 24
    offset = to_int(a.get("offset", 0), 0, 1_000_000) or 0
    w = ("WHERE " + " AND ".join(where)) if where else ""
    total = con.execute(f"SELECT COUNT(*) FROM listings {w}", params).fetchone()[0]
    rows = con.execute(f"SELECT * FROM listings {w} ORDER BY {order} LIMIT ? OFFSET ?", params + [limit, offset]).fetchall()
    return {"items": [public(r) for r in rows], "total": total}


@app.get("/api/listings/<lid>")
def get_listing(lid):
    con = db()
    row = con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone()
    if not row:
        return err("Объявление не найдено", 404, "not_found")
    own, viewer, now = is_owner(row), viewer_hash(), int(time.time())
    if not own:                          # свои просмотры не считаем
        if con.execute("INSERT OR IGNORE INTO views (listing_id, viewer, first_seen, last_seen) VALUES (?,?,?,?)",
                       (lid, viewer, now, now)).rowcount:
            con.execute("UPDATE listings SET views = views + 1 WHERE id = ?", (lid,))
            if row["views"] + 1 in VIEW_MILESTONES and row["owner_hash"]:
                notify(con, row["owner_hash"], "views", "#/item/" + lid, grp="views:" + lid, lst=row, data={"n": row["views"] + 1})
        else:
            con.execute("UPDATE views SET last_seen = ? WHERE listing_id = ? AND viewer = ?", (now, lid, viewer))
        con.execute("UPDATE visits SET views = views + 1 WHERE visitor = ? AND day = ?", (viewer, local_day(now)))
        con.commit()
        row = con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone()
    d = dict(public(row), own=own, **listing_stats(con, row, viewer))
    if own:
        d["bump_in"] = bump_wait(row, now)
    return d


@app.post("/api/listings")
def create_listing():
    f = request.form
    ip = client_ip()
    con = db()
    recent = con.execute("SELECT COUNT(*) FROM listings WHERE ip = ? AND created > ?",
                         (ip, int(time.time()) - 3600)).fetchone()[0]
    me = user_hash()
    if not recent < PER_IP_PER_HOUR or (me and con.execute(
            "SELECT COUNT(*) FROM listings WHERE owner_hash = ? AND created > ?",
            (me, int(time.time()) - 3600)).fetchone()[0] >= PER_USER_PER_HOUR):
        return err("Слишком много объявлений за час. Попробуйте позже.", 429, "rate_limit")
    if banned(con, me):
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
    if files and shutil.disk_usage(UPLOADS).free < MIN_FREE_BYTES:   # на диске всегда остаётся 1 ГБ
        return err("На сервере закончилось место", 507, "disk_full")
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
        " created, updated, owner_hash, bumped, torg, swap, credit) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (lid, cat, title, price, city, clean(f.get("desc"), 3000), clean(f.get("name"), 30) or "Продавец",
         phone, json.dumps(parse_extra(cat, f), ensure_ascii=False), json.dumps(names), sha(token), ip,
         now, now, me or "", now, flag(f.get("torg")), flag(f.get("swap")), flag(f.get("credit"))),
    )
    match_saved_searches(con, con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone())
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

    torg, swap, credit = ((flag(d[k]) if k in d else row[k]) for k in ("torg", "swap", "credit"))
    price_old = row["price_old"]
    if price != row["price"]:            # цена снизилась — показываем старую зачёркнутой
        price_old = row["price"] if 0 < price < row["price"] else 0
    con.execute(
        "UPDATE listings SET title = ?, price = ?, city = ?, descr = ?, name = ?, phone = ?, extra = ?,"
        " sold = ?, updated = ?, price_old = ?, torg = ?, swap = ?, credit = ? WHERE id = ?",
        (title, price, city, descr, name, phone, json.dumps(extra, ensure_ascii=False), sold,
         int(time.time()), price_old, torg, swap, credit, lid),
    )
    new = con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone()
    if 0 < price < row["price"] and not sold:
        notify_favorites(con, new, "price", {"old": row["price"], "new": price})
    if sold and not row["sold"]:
        notify_favorites(con, new, "sold", {})
    con.commit()
    return public(new)


@app.post("/api/listings/<lid>/bump")
def bump_listing(lid):
    """Поднять своё объявление наверх ленты — бесплатно, раз в сутки."""
    con = db()
    row = con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone()
    if not row:
        return err("Объявление не найдено", 404, "not_found")
    if not edit_rights(row):
        return err("Нет прав на изменение", 403, "forbidden")
    if row["sold"]:
        return err("Проданное объявление нельзя поднять", code="bump_sold")
    now = int(time.time())
    wait = bump_wait(row, now)
    if wait and not is_admin():
        return jsonify({"error": "Поднять можно раз в сутки", "code": "bump_wait", "wait": wait}), 429
    con.execute("UPDATE listings SET bumped = ? WHERE id = ?", (now, lid))
    con.commit()
    return dict(public(con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone()), bump_in=BUMP_EVERY)


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
    for table in ("views", "favorites", "notifications"):
        con.execute(f"DELETE FROM {table} WHERE listing_id = ?", (lid,))
    con.commit()
    delete_photo_files(json.loads(row["photos"]))
    delete_media(media)
    return {"ok": True}


# ---------------------------------------------------------------- чат
def chat_limit_hit(con, ip, who):
    since = int(time.time()) - 60
    if con.execute("SELECT COUNT(*) FROM messages WHERE sender_hash = ? AND created > ?", (who, since)).fetchone()[0] >= CHAT_MSG_PER_MIN:
        return True
    return con.execute("SELECT COUNT(*) FROM messages WHERE ip = ? AND created > ?", (ip, since)).fetchone()[0] >= CHAT_IP_PER_MIN


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


def add_message(con, conv, sender, body, ip, media=None, who=""):
    now = int(time.time())
    kind, fname, meta, size = media or ("text", "", {}, 0)
    cur = con.execute(
        "INSERT INTO messages (conv_id, sender, body, kind, media, meta, media_size, created, ip, sender_hash)"
        " VALUES (?,?,?,?,?,?,?,?,?,?)", (conv["id"], sender, body, kind, fname, json.dumps(meta), size, now, ip, who))
    other = "seller_unread" if sender == "buyer" else "buyer_unread"
    con.execute(f"UPDATE conversations SET updated = ?, last_text = ?, last_kind = ?, last_sender = ?, {other} = {other} + 1"
                " WHERE id = ?", (now, body[:140], kind, sender, conv["id"]))
    # уведомление получателю: кто написал, по какому объявлению, что именно
    lst = con.execute("SELECT id, title, photos, owner_hash, name FROM listings WHERE id = ?", (conv["listing_id"],)).fetchone()
    if lst is not None:
        to = lst["owner_hash"] if sender == "buyer" else conv["buyer_hash"]
        actor = conv["buyer_name"] if sender == "buyer" else lst["name"]
        notify(con, to, "msg", "#/chat/" + conv["id"], grp="chat:" + conv["id"], actor=actor or "", text=body, lst=lst,
               data={"kind": kind, "from": sender})
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


def media_quota_left(con, ip, who):
    since = int(time.time()) - 86400
    by_ip = sum(con.execute(f"SELECT COALESCE(SUM(media_size), 0) FROM {table} WHERE ip = ? AND created > ?",
                            (ip, since)).fetchone()[0] for table in ("messages", "support_messages"))
    mine = con.execute("SELECT COALESCE(SUM(media_size), 0) FROM messages WHERE sender_hash = ? AND created > ?",
                       (who or "-", since)).fetchone()[0]
    mine += con.execute("SELECT COALESCE(SUM(m.media_size), 0) FROM support_messages m JOIN support_threads t ON t.id = m.thread_id"
                        " WHERE t.owner = ? AND m.sender = 'user' AND m.created > ?", (who or "-", since)).fetchone()[0]
    return min(MEDIA_DAY_BYTES - mine, MEDIA_IP_DAY_BYTES - by_ip)


def store_media(con, fs, kind, dur, ip, who=""):
    """Проверяет и сохраняет файл. Возвращает (kind, имя файла, meta, размер).
    Фото пересохраняются (без EXIF/GPS), видео и голосовые — как есть, но только известных форматов."""
    size = file_size(fs)
    if size == 0:
        raise MediaError("media_bad", "Пустой файл")
    if size > media_quota_left(con, ip, who):
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
    if chat_limit_hit(con, ip, me):
        return err("Слишком много сообщений", 429, "rate_limit_chat")
    conv = con.execute("SELECT * FROM conversations WHERE listing_id = ? AND buyer_hash = ?", (lst["id"], me)).fetchone()
    if conv is None:
        hour = int(time.time()) - 3600
        mine_new = con.execute("SELECT COUNT(*) FROM conversations WHERE buyer_hash = ? AND created > ?", (me, hour)).fetchone()[0]
        ip_new = con.execute(
            "SELECT COUNT(*) FROM conversations c JOIN messages m ON m.conv_id = c.id AND m.id ="
            " (SELECT MIN(id) FROM messages WHERE conv_id = c.id) WHERE m.ip = ? AND c.created > ?",
            (ip, hour)).fetchone()[0]
        if mine_new >= CHAT_NEW_PER_HOUR or ip_new >= CHAT_NEW_IP_PER_HOUR:
            return err("Слишком много новых диалогов", 429, "rate_limit_chat")
    media = None
    if fs is not None:
        try:
            media = store_media(con, fs, kind, dur, ip, me)
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
    add_message(con, conv, "buyer", body, ip, media, me)
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
        return {"unread": 0, "notif_unread": 0, "notif_last": 0}
    con = db()
    n = con.execute(
        "SELECT COALESCE(SUM(CASE WHEN c.buyer_hash = ? THEN c.buyer_unread ELSE c.seller_unread END), 0)"
        " FROM conversations c JOIN listings l ON l.id = c.listing_id"
        " WHERE c.buyer_hash = ? OR l.owner_hash = ?", (me, me, me)).fetchone()[0]
    nu, nlast = con.execute("SELECT COALESCE(SUM(1 - is_read), 0), COALESCE(MAX(id), 0) FROM notifications WHERE owner = ?",
                            (me,)).fetchone()
    return {"unread": n + support_unread_of(con, me), "notif_unread": nu, "notif_last": nlast}


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
    seen = con.execute("UPDATE notifications SET is_read = 1 WHERE owner = ? AND grp = ? AND is_read = 0",
                       (me, "chat:" + cid)).rowcount
    if row[mine_unread]:
        con.execute(f"UPDATE conversations SET {mine_unread} = 0 WHERE id = ?", (cid,))
    if row[mine_unread] or seen:
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
    if chat_limit_hit(con, ip, me):
        return err("Слишком много сообщений", 429, "rate_limit_chat")
    media = None
    if fs is not None:
        try:
            media = store_media(con, fs, kind, dur, ip, me)
        except MediaError as e:
            return media_error(e)
    role = "buyer" if row["buyer_hash"] == me else "seller"
    mid = add_message(con, row, role, body, ip, media, me)
    con.commit()
    return {"message": msg_public(con.execute("SELECT * FROM messages WHERE id = ?", (mid,)).fetchone(), True)}, 201


# ---------------------------------------------------------------- сообщения администратору
SUPPORT_PER_10MIN = 8        # сообщений администратору за 10 минут с одного устройства
SUPPORT_IP_PER_10MIN = 60    # и с одного IP
SUPPORT_NEW_PER_HOUR = 40    # новых обращений в час с одного IP


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
    if sender != "user":                 # ответ администратора — уведомление человеку
        notify(con, thread["owner"], "support", "#/support", grp="support", actor="SystemMarket", text=body, data={"kind": kind})
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
    seen = con.execute("UPDATE notifications SET is_read = 1 WHERE owner = ? AND grp = 'support' AND is_read = 0", (me,)).rowcount
    if t["user_unread"]:
        con.execute("UPDATE support_threads SET user_unread = 0 WHERE id = ?", (t["id"],))
    if t["user_unread"] or seen:
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
    n_ip = con.execute("SELECT COUNT(*) FROM support_messages WHERE ip = ? AND sender = 'user' AND created > ?",
                       (ip, now - 600)).fetchone()[0]
    n_me = con.execute("SELECT COUNT(*) FROM support_messages m JOIN support_threads t ON t.id = m.thread_id"
                       " WHERE t.owner = ? AND m.sender = 'user' AND m.created > ?", (me, now - 600)).fetchone()[0]
    if n_me >= SUPPORT_PER_10MIN or n_ip >= SUPPORT_IP_PER_10MIN:
        return err("Слишком много сообщений", 429, "rate_limit_chat")
    t = con.execute("SELECT * FROM support_threads WHERE owner = ?", (me,)).fetchone()
    if t is None and con.execute("SELECT COUNT(*) FROM support_threads WHERE ip = ? AND created > ?",
                                 (ip, now - 3600)).fetchone()[0] >= SUPPORT_NEW_PER_HOUR:
        return err("Слишком много сообщений", 429, "rate_limit_chat")
    media = None
    if fs is not None:
        try:
            media = store_media(con, fs, kind, dur, ip, me)
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
    changed += con.execute("UPDATE notifications SET owner = ? WHERE owner = ?", (acct, dev)).rowcount
    con.execute("INSERT OR IGNORE INTO favorites (listing_id, owner, created) SELECT listing_id, ?, created FROM favorites"
                " WHERE owner = ?", (acct, dev))
    changed += con.execute("DELETE FROM favorites WHERE owner = ?", (dev,)).rowcount
    for srch in con.execute("SELECT id, params FROM saved_searches WHERE owner = ?", (dev,)).fetchall():
        if con.execute("SELECT 1 FROM saved_searches WHERE owner = ? AND params = ?", (acct, srch["params"])).fetchone():
            con.execute("DELETE FROM saved_searches WHERE id = ?", (srch["id"],))
        else:
            con.execute("UPDATE saved_searches SET owner = ? WHERE id = ?", (acct, srch["id"]))
        changed += 1
    if changed or names:
        con.commit()
        delete_media(names)


@app.get("/api/notifications")
def notifications_list():
    me = user_hash()
    if not me:
        return {"items": [], "unread": 0}
    con = db()
    after = to_int(request.args.get("after", 0), 0, 10**12) or 0
    rows = con.execute("SELECT * FROM notifications WHERE owner = ? AND id > ? ORDER BY id DESC LIMIT 100", (me, after)).fetchall()
    unread = con.execute("SELECT COUNT(*) FROM notifications WHERE owner = ? AND is_read = 0", (me,)).fetchone()[0]
    return {"items": [notif_public(n) for n in rows], "unread": unread}


@app.post("/api/notifications/read")
def notifications_read():
    me = user_hash()
    if not me:
        return err("Нет ключа устройства", 401, "no_user")
    d = request.get_json(silent=True) or {}
    con = db()
    if d.get("all"):
        con.execute("UPDATE notifications SET is_read = 1 WHERE owner = ? AND is_read = 0", (me,))
    else:
        ids = [i for i in (d.get("ids") or []) if isinstance(i, int)][:200]
        if ids:
            con.execute("UPDATE notifications SET is_read = 1 WHERE owner = ? AND id IN (%s)" % ",".join("?" * len(ids)), [me] + ids)
    con.commit()
    return {"ok": True, "unread": con.execute("SELECT COUNT(*) FROM notifications WHERE owner = ? AND is_read = 0", (me,)).fetchone()[0]}


@app.delete("/api/notifications")
def notifications_clear():
    me = user_hash()
    if not me:
        return err("Нет ключа устройства", 401, "no_user")
    con = db()
    con.execute("DELETE FROM notifications WHERE owner = ?", (me,))
    con.commit()
    return {"ok": True}


@app.post("/api/favorites")
def favorites_set():
    """Избранное на сервере: продавец видит «в избранном у N», покупатель узнаёт о снижении цены."""
    me = user_hash()
    if not me:
        return err("Нет ключа устройства", 401, "no_user")
    d = request.get_json(silent=True) or {}
    ids = d.get("ids") if isinstance(d.get("ids"), list) else [d.get("listing_id")]
    ids = [i for i in ids if isinstance(i, str) and re.fullmatch(r"[a-z0-9]{6,32}", i)][:200]
    on, quiet = d.get("on", True) is not False, bool(d.get("sync"))
    con, now = db(), int(time.time())
    for lid in ids:
        if not on:
            con.execute("DELETE FROM favorites WHERE listing_id = ? AND owner = ?", (lid, me))
            continue
        row = con.execute("SELECT * FROM listings WHERE id = ?", (lid,)).fetchone()
        if row is None or row["owner_hash"] == me:
            continue
        added = con.execute("INSERT OR IGNORE INTO favorites (listing_id, owner, created) VALUES (?,?,?)", (lid, me, now)).rowcount
        if added and not quiet and row["owner_hash"]:
            n = con.execute("SELECT COUNT(*) FROM favorites WHERE listing_id = ?", (lid,)).fetchone()[0]
            notify(con, row["owner_hash"], "fav", "#/item/" + lid, grp="fav:" + lid, lst=row, data={"n": n})
    con.commit()
    return {"ok": True}


@app.get("/api/searches")
def searches_list():
    me = user_hash()
    if not me:
        return {"items": []}
    rows = db().execute("SELECT * FROM saved_searches WHERE owner = ? ORDER BY id DESC", (me,)).fetchall()
    return {"items": [{"id": r["id"], "params": json.loads(r["params"]), "label": r["label"], "created": r["created"],
                       "hits": r["hits"]} for r in rows]}


@app.post("/api/searches")
def searches_add():
    me = user_hash()
    if not me:
        return err("Нет ключа устройства", 401, "no_user")
    d = request.get_json(silent=True) or {}
    p = search_params(d.get("params"))
    if not p:
        return err("Пустой поиск", code="empty")
    con = db()
    params = json.dumps(p, sort_keys=True, ensure_ascii=False)
    have = con.execute("SELECT * FROM saved_searches WHERE owner = ? AND params = ?", (me, params)).fetchone()
    if have is None:
        if con.execute("SELECT COUNT(*) FROM saved_searches WHERE owner = ?", (me,)).fetchone()[0] >= SEARCHES_MAX:
            return err("Можно сохранить до 20 поисков", code="searches_max")
        con.execute("INSERT INTO saved_searches (owner, params, label, created) VALUES (?,?,?,?)",
                    (me, params, clean(d.get("label"), 60), int(time.time())))
        con.commit()
        have = con.execute("SELECT * FROM saved_searches WHERE owner = ? AND params = ?", (me, params)).fetchone()
    return {"id": have["id"], "params": p, "label": have["label"]}, 201


@app.delete("/api/searches/<int:sid>")
def searches_delete(sid):
    me = user_hash()
    if not me:
        return err("Нет ключа устройства", 401, "no_user")
    con = db()
    con.execute("DELETE FROM saved_searches WHERE id = ? AND owner = ?", (sid, me))
    con.commit()
    return {"ok": True}


@app.post("/api/visit")
def visit():
    """Посещение сайта (для администратора): при открытии страницы и раз в несколько минут, пока она открыта."""
    d = request.get_json(silent=True) or {}
    con, now = db(), int(time.time())
    ip, ua, day = client_ip(), clean(request.headers.get("User-Agent"), 300), local_day(now)
    if con.execute("SELECT 1 FROM visits WHERE day = ? LIMIT 1", (day,)).fetchone() is None:
        # первый заход за сутки — убираем старое
        con.execute("DELETE FROM visits WHERE day < ?", (day - VISITS_KEEP_DAYS,))
        con.execute("DELETE FROM notifications WHERE created < ?", (now - 90 * 86400,))
    u = current_user()
    lang = d.get("lang") if d.get("lang") in ("ru", "tr", "tk") else ""
    con.execute(
        "INSERT INTO visits (visitor, day, ip, ua, lang, app, user_id, first_seen, last_seen, hits) VALUES (?,?,?,?,?,?,?,?,?,?)"
        " ON CONFLICT(visitor, day) DO UPDATE SET ip = excluded.ip, ua = excluded.ua,"
        " lang = CASE WHEN excluded.lang <> '' THEN excluded.lang ELSE lang END, app = excluded.app,"
        " user_id = CASE WHEN excluded.user_id > 0 THEN excluded.user_id ELSE user_id END,"
        " last_seen = excluded.last_seen, hits = hits + excluded.hits",
        (viewer_hash(), day, ip, ua, lang, 1 if d.get("app") else 0, u["id"] if u is not None else 0, now, now,
         1 if d.get("load") else 0))
    con.commit()
    return {"ok": True}


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
    now = int(time.time())
    today = dict(con.execute(
        "SELECT v.listing_id, COUNT(*) FROM views v JOIN listings l ON l.id = v.listing_id"
        " WHERE l.owner_hash = ? AND v.last_seen >= ? GROUP BY v.listing_id", (me, day_start(now))).fetchall())
    favs = dict(con.execute(
        "SELECT f.listing_id, COUNT(*) FROM favorites f JOIN listings l ON l.id = f.listing_id"
        " WHERE l.owner_hash = ? GROUP BY f.listing_id", (me,)).fetchall())
    items = []
    for r in rows:
        x = public(r)
        x["chats"] = chats.get(r["id"], 0)        # сколько покупателей написали по объявлению
        x["views_today"] = today.get(r["id"], 0)
        x["favs"] = favs.get(r["id"], 0)
        x["bump_in"] = bump_wait(r, now)
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
            "visitors_today": con.execute("SELECT COUNT(*) FROM visits WHERE day = ?", (local_day(int(time.time())),)).fetchone()[0],
            "online": con.execute("SELECT COUNT(DISTINCT visitor) FROM visits WHERE last_seen > ?", (int(time.time()) - 300,)).fetchone()[0],
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


@app.post("/api/admin/bans")
@admin_only
def admin_ban_add():
    """Заблокировать посетителя по его хешу (из вкладки «Посетители»)."""
    d = request.get_json(silent=True) or {}
    h = str(d.get("hash", ""))
    if not re.fullmatch(r"[a-f0-9]{64}", h):
        return err("Неверный посетитель", code="bad_request")
    con = db()
    con.execute("INSERT OR REPLACE INTO bans (hash, reason, created) VALUES (?,?,?)",
                (h, clean(d.get("reason"), 100) or "Посетитель", int(time.time())))
    con.commit()
    return {"ok": True}


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


def device_of(ua):
    u = (ua or "").lower()
    os_name = ("Android" if "android" in u else "iPhone" if "iphone" in u else "iPad" if "ipad" in u else
               "Windows" if "windows" in u else "Mac" if "macintosh" in u or "mac os" in u else "Linux" if "linux" in u else "")
    browser = ("app" if "systemmarketapp" in u else "Edge" if "edg/" in u else "Opera" if "opr/" in u or "opera" in u else
               "Yandex" if "yabrowser" in u else "Samsung" if "samsungbrowser" in u else
               "Chrome" if "chrome" in u or "crios" in u else "Firefox" if "firefox" in u or "fxios" in u else
               "Safari" if "safari" in u else "")
    return os_name, browser


@app.get("/api/admin/visitors")
@admin_only
def admin_visitors():
    """Сколько людей заходило и откуда: за сутки, неделю, месяц; список посетителей с IP."""
    con, now = db(), int(time.time())
    today = local_day(now)
    one = lambda sql, *a: con.execute(sql, a).fetchone()[0]
    stats = {
        "online": one("SELECT COUNT(DISTINCT visitor) FROM visits WHERE last_seen > ?", now - 300),
        "today": one("SELECT COUNT(*) FROM visits WHERE day = ?", today),
        "today_loads": one("SELECT COALESCE(SUM(hits), 0) FROM visits WHERE day = ?", today),
        "today_ips": one("SELECT COUNT(DISTINCT ip) FROM visits WHERE day = ?", today),
        "today_app": one("SELECT COUNT(*) FROM visits WHERE day = ? AND app = 1", today),
        "today_views": one("SELECT COALESCE(SUM(views), 0) FROM visits WHERE day = ?", today),
        "yesterday": one("SELECT COUNT(*) FROM visits WHERE day = ?", today - 1),
        "week": one("SELECT COUNT(DISTINCT visitor) FROM visits WHERE day > ?", today - 7),
        "month": one("SELECT COUNT(DISTINCT visitor) FROM visits WHERE day > ?", today - 30),
    }
    per_day = {r[0]: (r[1], r[2]) for r in con.execute(
        "SELECT day, COUNT(*), COALESCE(SUM(hits), 0) FROM visits WHERE day > ? GROUP BY day", (today - 14,))}
    days = [{"ts": d * 86400 - TZ_OFFSET + 43200, "visitors": per_day.get(d, (0, 0))[0], "loads": per_day.get(d, (0, 0))[1]}
            for d in range(today - 13, today + 1)]
    users = {r["id"]: r for r in con.execute("SELECT id, name, email FROM users")}
    bans = ban_set(con)
    items = []
    # для каждого посетителя — последний день (IP, браузер, язык), всего заходов и открытых объявлений
    for r in con.execute("SELECT visitor, MAX(last_seen) AS last, ip, ua, lang, app, user_id, SUM(hits) AS hits,"
                         " SUM(views) AS views, COUNT(*) AS days,"
                         " (SELECT MIN(first_seen) FROM visits v2 WHERE v2.visitor = v.visitor) AS first"
                         " FROM visits v GROUP BY visitor ORDER BY last DESC LIMIT 300"):
        os_name, browser = device_of(r["ua"])
        u = users.get(r["user_id"])
        items.append({"hash": r["visitor"], "ip": r["ip"], "os": os_name, "browser": browser, "app": bool(r["app"]),
                      "lang": r["lang"], "first": r["first"], "last": r["last"], "hits": r["hits"], "views": r["views"],
                      "days": r["days"], "online": r["last"] > now - 300, "banned": r["visitor"] in bans,
                      "user": {"name": u["name"], "email": u["email"]} if u is not None else None})
    return {"stats": stats, "days": days, "items": items}


@app.get("/api/admin/listings")
@admin_only
def admin_listings():
    """Все объявления с IP подавшего, просмотрами, избранным и перепиской — для модерации."""
    con = db()
    rows = con.execute("SELECT l.*, (SELECT COUNT(*) FROM favorites f WHERE f.listing_id = l.id) AS favs,"
                       " (SELECT COUNT(*) FROM conversations c WHERE c.listing_id = l.id) AS chats"
                       " FROM listings l ORDER BY l.created DESC LIMIT 300").fetchall()
    bans = ban_set(con)
    return {"items": [dict(public(r), ip=r["ip"], favs=r["favs"], chats=r["chats"], owner=r["owner_hash"],
                           banned=bool(r["owner_hash"]) and r["owner_hash"] in bans) for r in rows]}


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
    con.execute("DELETE FROM views")
    con.execute("DELETE FROM favorites")
    con.execute("DELETE FROM notifications WHERE listing_id <> ''")
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
