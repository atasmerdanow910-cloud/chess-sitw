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
import sqlite3
import time
import warnings

from flask import Flask, abort, g, jsonify, request, send_from_directory
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get("SM_DATA", os.path.join(HERE, "data"))
UPLOADS = os.path.join(DATA, "uploads")
DB_PATH = os.path.join(DATA, "market.db")
ADMIN_TOKEN = os.environ.get("SM_ADMIN_TOKEN", "")
DEV = os.environ.get("SM_DEV") == "1"

CATS = ("auto", "realty", "phones", "electronics", "home", "clothes", "services", "other")
CITIES = {"Ашхабад", "Аркадаг", "Балканабат", "Дашогуз", "Мары", "Туркменабат",
          "Туркменбаши", "Теджен", "Байрамали", "Другой"}
MAX_PHOTOS = 6
MAX_SIDE = 1600
THUMB_SIDE = 480
PER_IP_PER_HOUR = 15
PAGE_MAX = 60
MAX_PRICE = 10_000_000_000

os.makedirs(UPLOADS, exist_ok=True)

# Защита от «бомб» — огромных картинок, которые съедают память.
Image.MAX_IMAGE_PIXELS = 30_000_000
warnings.simplefilter("error", Image.DecompressionBombWarning)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 40 * 1024 * 1024
app.json.ensure_ascii = False

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
"""

# Колонки, которых не было в первых версиях базы, — добавляются при запуске.
MIGRATIONS = {
    "sold": "ALTER TABLE listings ADD COLUMN sold INTEGER NOT NULL DEFAULT 0",
    "updated": "ALTER TABLE listings ADD COLUMN updated INTEGER NOT NULL DEFAULT 0",
    "owner_hash": "ALTER TABLE listings ADD COLUMN owner_hash TEXT NOT NULL DEFAULT ''",
}
CHAT_MSG_PER_MIN = 20        # сообщений в минуту с одного IP
CHAT_NEW_PER_HOUR = 30       # новых диалогов в час с одного IP
CHAT_MAX_LEN = 2000


def init_db():
    con = sqlite3.connect(DB_PATH, timeout=10)
    try:
        con.execute("PRAGMA journal_mode=WAL")
        con.executescript(SCHEMA)
        have = {r[1] for r in con.execute("PRAGMA table_info(listings)")}
        for column, sql in MIGRATIONS.items():
            if column not in have:
                try:
                    con.execute(sql)
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


def user_hash():
    """Анонимный ключ устройства (X-User-Key) → его хеш. Сам ключ на сервере не хранится."""
    key = request.headers.get("X-User-Key", "")
    return sha("u:" + key) if UID_RE.fullmatch(key) else None


def edit_rights(row):
    token = request.headers.get("X-Edit-Token", "")
    is_owner = bool(token) and hmac.compare_digest(sha(token), row["token_hash"])
    is_admin = bool(ADMIN_TOKEN) and bool(token) and hmac.compare_digest(token, ADMIN_TOKEN)
    return is_owner or is_admin


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
    return public(row)


@app.post("/api/listings")
def create_listing():
    f = request.form
    ip = client_ip()
    con = db()
    recent = con.execute("SELECT COUNT(*) FROM listings WHERE ip = ? AND created > ?",
                         (ip, int(time.time()) - 3600)).fetchone()[0]
    if recent >= PER_IP_PER_HOUR:
        return err("Слишком много объявлений за час. Попробуйте позже.", 429, "rate_limit")

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

    files = [x for x in request.files.getlist("photos") if x and x.filename][:MAX_PHOTOS]
    if not files:
        return err("Добавьте хотя бы одно фото товара", code="photo_required")
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
    con.execute("DELETE FROM messages WHERE conv_id IN (SELECT id FROM conversations WHERE listing_id = ?)", (lid,))
    con.execute("DELETE FROM conversations WHERE listing_id = ?", (lid,))
    con.execute("DELETE FROM listings WHERE id = ?", (lid,))
    con.commit()
    delete_photo_files(json.loads(row["photos"]))
    return {"ok": True}


# ---------------------------------------------------------------- чат
def chat_limit_hit(con, ip):
    n = con.execute("SELECT COUNT(*) FROM messages WHERE ip = ? AND created > ?",
                    (ip, int(time.time()) - 60)).fetchone()[0]
    return n >= CHAT_MSG_PER_MIN


def conv_row(con, cid, me):
    """Диалог + объявление, если текущее устройство в нём участвует. Иначе None."""
    if not re.fullmatch(r"[a-f0-9]{16}", cid or ""):
        return None
    row = con.execute(
        "SELECT c.*, l.title, l.price, l.photos, l.sold, l.name AS seller_name, l.owner_hash"
        " FROM conversations c JOIN listings l ON l.id = c.listing_id WHERE c.id = ?", (cid,)).fetchone()
    if row is None or me not in (row["buyer_hash"], row["owner_hash"]):
        return None
    return row


def conv_public(row, me):
    role = "buyer" if row["buyer_hash"] == me else "seller"
    photos = json.loads(row["photos"])
    return {
        "id": row["id"], "role": role,
        "unread": row["buyer_unread"] if role == "buyer" else row["seller_unread"],
        "updated": row["updated"], "last_text": row["last_text"],
        "last_mine": row["last_sender"] == role,
        "other_name": row["seller_name"] if role == "buyer" else row["buyer_name"],
        "listing": {"id": row["listing_id"], "title": row["title"], "price": row["price"], "sold": bool(row["sold"]),
                    "thumb": photo_urls(photos[:1])[0]["thumb"] if photos else ""},
    }


def add_message(con, conv, sender, body, ip):
    now = int(time.time())
    con.execute("INSERT INTO messages (conv_id, sender, body, created, ip) VALUES (?,?,?,?,?)",
                (conv["id"], sender, body, now, ip))
    other = "seller_unread" if sender == "buyer" else "buyer_unread"
    con.execute(f"UPDATE conversations SET updated = ?, last_text = ?, last_sender = ?, {other} = {other} + 1"
                " WHERE id = ?", (now, body[:140], sender, conv["id"]))


@app.post("/api/me/claim")
def claim_listings():
    """Привязать свои старые объявления (по ключам редактирования) к устройству — чтобы видеть их чаты."""
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
    d = request.get_json(silent=True) or {}
    body = clean(d.get("text"), CHAT_MAX_LEN)
    if not body:
        return err("Пустое сообщение", code="empty")
    con, ip = db(), client_ip()
    lst = con.execute("SELECT id, owner_hash FROM listings WHERE id = ?", (str(d.get("listing_id", "")),)).fetchone()
    if not lst:
        return err("Объявление не найдено", 404, "not_found")
    if lst["owner_hash"] == me:
        return err("Это ваше объявление", code="own_listing")
    if chat_limit_hit(con, ip):
        return err("Слишком много сообщений", 429, "rate_limit_chat")
    conv = con.execute("SELECT * FROM conversations WHERE listing_id = ? AND buyer_hash = ?", (lst["id"], me)).fetchone()
    name = clean(d.get("name"), 30)
    if conv is None:
        recent = con.execute(
            "SELECT COUNT(*) FROM conversations c JOIN messages m ON m.conv_id = c.id AND m.id ="
            " (SELECT MIN(id) FROM messages WHERE conv_id = c.id) WHERE m.ip = ? AND c.created > ?",
            (ip, int(time.time()) - 3600)).fetchone()[0]
        if recent >= CHAT_NEW_PER_HOUR:
            return err("Слишком много новых диалогов", 429, "rate_limit_chat")
        cid, now = secrets.token_hex(8), int(time.time())
        con.execute("INSERT INTO conversations (id, listing_id, buyer_hash, buyer_name, created, updated)"
                    " VALUES (?,?,?,?,?,?)", (cid, lst["id"], me, name, now, now))
        conv = con.execute("SELECT * FROM conversations WHERE id = ?", (cid,)).fetchone()
    elif name:
        con.execute("UPDATE conversations SET buyer_name = ? WHERE id = ?", (name, conv["id"]))
    add_message(con, conv, "buyer", body, ip)
    con.commit()
    return {"conv": conv_public(conv_row(con, conv["id"], me), me)}, 201


@app.get("/api/chats")
def list_chats():
    me = user_hash()
    if not me:
        return {"items": [], "unread": 0}
    rows = db().execute(
        "SELECT c.*, l.title, l.price, l.photos, l.sold, l.name AS seller_name, l.owner_hash"
        " FROM conversations c JOIN listings l ON l.id = c.listing_id"
        " WHERE c.buyer_hash = ? OR l.owner_hash = ? ORDER BY c.updated DESC LIMIT 100", (me, me)).fetchall()
    items = [conv_public(r, me) for r in rows]
    return {"items": items, "unread": sum(i["unread"] for i in items)}


@app.get("/api/chats/unread")
def chats_unread():
    me = user_hash()
    if not me:
        return {"unread": 0}
    n = db().execute(
        "SELECT COALESCE(SUM(CASE WHEN c.buyer_hash = ? THEN c.buyer_unread ELSE c.seller_unread END), 0)"
        " FROM conversations c JOIN listings l ON l.id = c.listing_id"
        " WHERE c.buyer_hash = ? OR l.owner_hash = ?", (me, me, me)).fetchone()[0]
    return {"unread": n}


@app.get("/api/chats/<cid>/messages")
def chat_messages(cid):
    me = user_hash()
    con = db()
    row = conv_row(con, cid, me) if me else None
    if row is None:
        return err("Диалог не найден", 404, "not_found")
    role = "buyer" if row["buyer_hash"] == me else "seller"
    after = to_int(request.args.get("after", 0), 0, 10**12) or 0
    msgs = con.execute("SELECT id, sender, body, created FROM messages WHERE conv_id = ? AND id > ? ORDER BY id LIMIT 300",
                       (cid, after)).fetchall()
    mine_unread = "buyer_unread" if role == "buyer" else "seller_unread"
    if row[mine_unread]:
        con.execute(f"UPDATE conversations SET {mine_unread} = 0 WHERE id = ?", (cid,))
        con.commit()
    return {
        "conv": conv_public(row, me),
        "messages": [{"id": m["id"], "mine": m["sender"] == role, "text": m["body"], "created": m["created"]} for m in msgs],
    }


@app.post("/api/chats/<cid>/messages")
def chat_send(cid):
    me = user_hash()
    con = db()
    row = conv_row(con, cid, me) if me else None
    if row is None:
        return err("Диалог не найден", 404, "not_found")
    d = request.get_json(silent=True) or {}
    body = clean(d.get("text"), CHAT_MAX_LEN)
    if not body:
        return err("Пустое сообщение", code="empty")
    ip = client_ip()
    if chat_limit_hit(con, ip):
        return err("Слишком много сообщений", 429, "rate_limit_chat")
    role = "buyer" if row["buyer_hash"] == me else "seller"
    add_message(con, row, role, body, ip)
    con.commit()
    m = con.execute("SELECT id, created FROM messages WHERE conv_id = ? ORDER BY id DESC LIMIT 1", (cid,)).fetchone()
    return {"message": {"id": m["id"], "mine": True, "text": body, "created": m["created"]}}, 201


@app.get("/api/admin/check")
def admin_check():
    token = request.headers.get("X-Edit-Token", "")
    ok = bool(ADMIN_TOKEN and token and hmac.compare_digest(token, ADMIN_TOKEN))
    return {"admin": ok}


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

    @app.get("/uploads/<path:name>")
    def dev_uploads(name):
        if not re.fullmatch(r"[a-f0-9]{24}(_t)?\.jpg", name):
            abort(404)
        return send_from_directory(UPLOADS, name)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 8000)), debug=DEV)
