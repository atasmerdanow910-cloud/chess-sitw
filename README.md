# VPN Python

Сайт для Android-пользователей:

- **Pydroid 3 (APK)** — прямое скачивание с сайта;
- **инструкция из 7 шагов** с иллюстрациями: загрузка → разрешение установки → установка →
  запуск → доступ к хранилищу → открытие .py → запуск кода;
- **библиотека скриптов** — просмотр кода с подсветкой, копирование в один клик, скачивание `.py`;
- **вход и регистрация через Google**; по желанию код и APK доступны только вошедшим;
- **админ-панель** (`/admin`) с паролем и 2FA: скрипты, APK, фото шагов, пользователи,
  защита, настройки.

## Фото-инструкция

На сайте каждый шаг показан серией экранов Android (их можно листать). Те же экраны в виде
картинок лежат в [`docs/instruction`](docs/instruction): например,
[доступ к хранилищу](docs/instruction/shag-5-storage.png) — 5 экранов от запроса Pydroid 3 до
«Доступа ко всем файлам».

Это нарисованные экраны. Чтобы заменить их настоящими скриншотами со своего телефона
(«Питание» + «Громкость вниз»), загрузите их в админке → **Фото** — до 6 на каждый шаг.

## Установка на сервер (Ubuntu)

Зайдите на сервер по SSH под `root`:

```bash
apt update && apt install -y git
git clone -b ccr-0774bf1d-0dfpmd https://github.com/atasmerdanow910-cloud/chess-sitw.git
cd chess-sitw
bash deploy/install.sh
```

Скрипт установит зависимости, спросит **пароль админки** (минимум 8 символов), настроит
автозапуск и покажет адреса сайта и админки. Если порт 80 занят: `PORT=8080 bash deploy/install.sh`.

После установки откройте `/admin`, загрузите APK (вкладка **APK**) и скрипты (вкладка **Файлы**).

## Защита от DDoS: Cloudflare

Сервер с 512 МБ памяти не выдержит настоящую DDoS-атаку сам по себе — её должен принимать
Cloudflare. Он бесплатный и заодно даёт HTTPS.

1. Купите домен и добавьте его в [dash.cloudflare.com](https://dash.cloudflare.com) (тариф Free).
2. У регистратора домена замените NS-серверы на выданные Cloudflare.
3. **DNS**: запись `A`, имя `@`, значение — IP сервера, облако **оранжевое** (Proxied).
4. **SSL/TLS** → режим **Flexible**, включите **Always Use HTTPS**.
5. **Security → Bots** → **Bot Fight Mode**. Во время атаки включайте **Under Attack Mode**.
6. В админке: **Настройки** → «Адрес сайта» = `https://ваш-домен`;
   **Защита** → «Принимать запросы только через Cloudflare».
7. Закройте сервер от прямых запросов фаерволом (SSH останется открытым):

   ```bash
   bash deploy/install.sh --cloudflare-firewall
   ```

   Отменить: `bash deploy/install.sh --cloudflare-firewall-off`.

## Вход через Google

Google разрешает вход только на сайтах **с доменом и HTTPS** — сначала подключите Cloudflare.

1. [console.cloud.google.com](https://console.cloud.google.com) → создайте проект.
2. **APIs & Services → OAuth consent screen**: тип **External**, название, email → **Publish app**.
3. **Credentials → Create credentials → OAuth client ID** → **Web application**.
4. **Authorized redirect URIs**: `https://ваш-домен/auth/google/callback`
   (точный адрес показан в админке, вкладка **Люди**).
5. Вставьте **Client ID** и **Client Secret** в админке → **Люди** → «Сохранить».

Там же можно включить «Скрипты только после входа» и «APK только после входа», смотреть список
пользователей и блокировать их.

## Что защищено

| Защита | Как работает |
|---|---|
| Cloudflare | Настоящий IP посетителя берётся из `CF-Connecting-IP` только для запросов с адресов Cloudflare — подделать нельзя |
| Лимит запросов | 240 запросов в минуту с одного IP; при флуде (в 3 раза больше) — автоблокировка на 15 минут |
| Лимиты действий | 40 скачиваний за 10 минут, 20 попыток входа через Google за 10 минут |
| Пароль админки | Хранится только хешем; 5 неверных попыток — вход закрыт на 10 минут |
| 2FA админки | Код из Google Authenticator, повторно использовать код нельзя |
| Вход через Google | OAuth 2.0 + PKCE, проверка `state`, `nonce`, `aud`, `iss`, срока действия и подтверждённого email |
| Сессии | Cookie `HttpOnly`, `SameSite=Lax`, `Secure` по HTTPS; смена пароля завершает чужие сессии |
| CSRF | Все действия админки и выход требуют токен |
| Заголовки | CSP, HSTS (по HTTPS), X-Frame-Options, Permissions-Policy, COOP/CORP, nosniff |
| Блокировки | IP и подсети вручную (на час/день/неделю/навсегда), блокировка пользователей Google |
| Журнал | Входы в админку, ошибки паролей и 2FA, автоблокировки, изменения настроек защиты |
| Файлы | `.py` никогда не выполняются на сервере; APK и фото проверяются по сигнатуре |

## Полезные команды

| Что сделать | Команда |
|---|---|
| Обновить сайт | `cd chess-sitw && git pull && bash deploy/install.sh` |
| Сменить пароль админки | `bash deploy/install.sh --password` |
| Отключить 2FA (потерян телефон) | `bash deploy/install.sh --reset-2fa` |
| Снять все блокировки IP | `bash deploy/install.sh --unblock-all` |
| Логи | `journalctl -u vpn-python -f` |
| Перезапуск | `systemctl restart vpn-python` |

Данные (скрипты, APK, фото, пользователи, пароль) хранятся в `/opt/vpn-python/data` и при
обновлении не теряются.

## Разработка

```bash
python3 -m venv venv && . venv/bin/activate
pip install -r requirements.txt
python app.py set-password
python app.py                              # http://localhost:8000
python -m unittest discover -s tests -v    # автотесты
```

---

«Python» и логотип Python — товарные знаки Python Software Foundation.
Pydroid 3 — стороннее приложение, все права принадлежат его разработчикам.
