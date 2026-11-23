# SystemMarket

Учебная доска объявлений: авто, недвижимость, телефоны и другое.

- `index.html` — весь фронтенд (одна страница, без зависимостей).
- `server/app.py` — API на Flask + SQLite. Фото пересохраняются через Pillow:
  поворот по EXIF, уменьшение до 1600 px, удаление метаданных (GPS).
- `deploy/install.sh` — установка на Ubuntu: nginx + gunicorn + systemd.

## Установка на сервер

```bash
curl -fsSL https://raw.githubusercontent.com/atasmerdanow910-cloud/chess-sitw/ccr-d10ab0ac-yrj6qu/marketplace/deploy/install.sh -o install.sh
DOMAIN=systemmarket.duckdns.org bash install.sh
```

Повторный запуск обновляет код; база (`/var/lib/systemmarket`) и фото сохраняются.

## Локально

```bash
cd server && pip install -r requirements.txt
SM_DEV=1 python app.py   # http://127.0.0.1:8000
```

## API

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/api/listings?cat=&city=&q=&sort=new\|cheap\|exp&limit=&offset=&ids=` | список |
| GET | `/api/listings/<id>` | одно объявление (+1 просмотр) |
| POST | `/api/listings` (multipart, `photos` до 6 шт.) | создать, возвращает `id` и `token` |
| DELETE | `/api/listings/<id>` с заголовком `X-Edit-Token` | удалить (владелец или админ) |
