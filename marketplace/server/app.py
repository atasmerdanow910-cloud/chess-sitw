"""SystemMarket API — доска объявлений (Flask + SQLite).

Запуск в продакшене: gunicorn -w 2 -b 127.0.0.1:8000 app:app (за nginx).
Локально для разработки: SM_DEV=1 python app.py — тогда Flask сам отдаёт
index.html и загруженные фото.
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

CATS = {"auto", "realty", "phones", "electronics", "home", "clothes", "services", "other"}
CITIES = {"Ашхабад", "Аркадаг", "Балканабат", "Дашогуз", "Мары", "Туркменабат",
          "Туркменбаши", "Теджен", "Байрамали", "Другой"}
MAX_PHOTOS = 6
MAX_SIDE = 1600
THUMB_SIDE = 480
PER_IP_PER_HOUR = 15
PAGE_MAX = 60

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
    created     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_created ON listings(created DESC);
CREATE INDEX IF NOT EXISTS idx_cat ON listings(cat, created DESC);
CREATE INDEX IF NOT EXISTS idx_ip ON listings(ip, created);
"""


def init_db():
    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA journal_mode=WAL")
    con.executescript(SCHEMA)
    con.commit()
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
def err(msg, code=400):
    return jsonify({"error": msg}), code


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


# ---------------------------------------------------------------- routes
@app.get("/api/health")
def health():
    return {"ok": True}


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
    if a.get("cat") in CATS:
        where.append("cat = ?")
        params.append(a["cat"])
    if a.get("city") in CITIES:
        where.append("city = ?")
        params.append(a["city"])
    q = clean(a.get("q"), 60).lower()
    if q:
        like = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        where.append("(lower(title) LIKE ? ESCAPE '\\' OR lower(descr) LIKE ? ESCAPE '\\' OR lower(extra) LIKE ? ESCAPE '\\')")
        params += [like, like, like]
    order = {"cheap": "price ASC, created DESC", "exp": "price DESC, created DESC"}.get(a.get("sort"), "created DESC")
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
        return err("Объявление не найдено", 404)
    return public(row)


@app.post("/api/listings")
def create_listing():
    f = request.form
    ip = client_ip()
    con = db()
    recent = con.execute("SELECT COUNT(*) FROM listings WHERE ip = ? AND created > ?",
                         (ip, int(time.time()) - 3600)).fetchone()[0]
    if recent >= PER_IP_PER_HOUR:
        return err("Слишком много объявлений за час. Попробуйте позже.", 429)

    cat = f.get("cat")
    title = clean(f.get("title"), 80)
    price = to_int(f.get("price"), 0, 10_000_000_000)
    city = f.get("city")
    phone = clean(f.get("phone"), 20)
    if cat not in CATS:
        return err("Выберите категорию")
    if len(title) < 3:
        return err("Заголовок слишком короткий")
    if price is None:
        return err("Укажите цену")
    if city not in CITIES:
        return err("Выберите город")
    if len(re.sub(r"\D", "", phone)) < 6:
        return err("Укажите телефон")

    files = [x for x in request.files.getlist("photos") if x and x.filename][:MAX_PHOTOS]
    if not files:
        return err("Добавьте хотя бы одно фото товара")
    names = []
    try:
        for fs in files:
            names.append(save_photo(fs))
    except ValueError as e:
        delete_photo_files(names)
        return err(str(e))

    lid = secrets.token_hex(6)
    token = secrets.token_urlsafe(24)
    con.execute(
        "INSERT INTO listings (id, cat, title, price, city, descr, name, phone, extra, photos, token_hash, ip, created)"
        " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (lid, cat, title, price, city, clean(f.get("desc"), 3000), clean(f.get("name"), 30) or "Продавец",
         phone, json.dumps(parse_extra(cat, f), ensure_ascii=False), json.dumps(names), sha(token), ip,
         int(time.time())),
    )
    con.commit()
    return {"id": lid, "token": token}, 201


@app.delete("/api/listings/<lid>")
def delete_listing(lid):
    token = request.headers.get("X-Edit-Token", "")
    con = db()
    row = con.execute("SELECT token_hash, photos FROM listings WHERE id = ?", (lid,)).fetchone()
    if not row:
        return err("Объявление не найдено", 404)
    is_owner = token and hmac.compare_digest(sha(token), row["token_hash"])
    is_admin = ADMIN_TOKEN and token and hmac.compare_digest(token, ADMIN_TOKEN)
    if not (is_owner or is_admin):
        return err("Нет прав на удаление", 403)
    con.execute("DELETE FROM listings WHERE id = ?", (lid,))
    con.commit()
    delete_photo_files(json.loads(row["photos"]))
    return {"ok": True}


@app.get("/api/admin/check")
def admin_check():
    token = request.headers.get("X-Edit-Token", "")
    ok = bool(ADMIN_TOKEN and token and hmac.compare_digest(token, ADMIN_TOKEN))
    return {"admin": ok}


@app.errorhandler(413)
def too_large(_e):
    return err("Фото слишком большие (максимум 40 МБ за раз)", 413)


@app.errorhandler(404)
def not_found(_e):
    if request.path.startswith("/api/"):
        return err("Не найдено", 404)
    if DEV:
        return send_from_directory(os.path.dirname(HERE), "index.html")
    return err("Не найдено", 404)


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
