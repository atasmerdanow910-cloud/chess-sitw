# Запуск Kerwen Market на сервере — пошагово

Сервер: ваш Ubuntu 24.04 (Амстердам). Заходите на него через VPN, как обычно.
Приложение тоже работает через VPN (ваше решение, см. `docs/DECISIONS.md`).

> ⚠️ **Память.** На сервере 512 МБ. Для старта хватит: скрипт добавит 2 ГБ swap. Но когда будут
> реальные пользователи, лучше взять сервер на **2 ГБ RAM**.

---

## Шаг 0. Домен

1. Купите домен (например `kerwenmarket.com`) у любого регистратора.
2. В настройках DNS добавьте запись **A**: имя `api`, значение — IP сервера `153.75.86.103`.
3. Через 5–30 минут адрес `api.kerwenmarket.com` будет вести на сервер.

## Шаг 1. Резервная копия старого сайта (SystemMarket)

Старый сайт занимает порты 80/443, поэтому его нужно остановить. **Сначала копия!**

```bash
mkdir -p /root/old-site-backup
# если сайт в Docker:
docker ps -a                       # посмотреть, что запущено
# если сайт работает через nginx / pm2 / systemd — скопируйте его папку:
tar czf /root/old-site-backup/site.tar.gz /var/www 2>/dev/null || true
```

Если у старого сайта есть база данных — сделайте её дамп (`pg_dump` или `mysqldump`).
Скопируйте `/root/old-site-backup` к себе на компьютер. **Удаляйте старый сайт только после этого.**

Остановить старый сайт (выберите то, что подходит):
```bash
docker stop $(docker ps -q)        # если он в Docker
systemctl stop nginx               # если nginx
```

## Шаг 2. Установка

```bash
apt-get update && apt-get install -y git
git clone https://github.com/atasmerdanow910-cloud/chess-sitw.git /opt/kerwen
cd /opt/kerwen && git checkout ccr-0788529d-vbt6rn     # ветка с проектом (или main после слияния)
cd deploy
sudo ./install.sh api.kerwenmarket.com                 # ваш домен
```

Скрипт сам: ставит Docker, включает swap и файрвол (открыты только 22, 80, 443),
создаёт случайные пароли в `deploy/.env`, запускает базу данных + сервер + HTTPS,
включает ежедневную резервную копию в 03:30.

Проверка: откройте `https://api.kerwenmarket.com/health` — должно быть `{"status":"ok"...}`.

## Шаг 3. Аккаунт владельца (ваш)

```bash
cd /opt/kerwen/deploy
docker compose exec api node dist/src/scripts/create-owner.js
```
Введите имя, телефон (+993…) и пароль (10+ символов). Этим телефоном и паролем входите в приложение —
в «Профиле» появится **«Панель владельца»**.

## Шаг 4. APK для телефонов

1. GitHub → репозиторий → **Settings → Secrets and variables → Actions → Variables** →
   `API_URLS` = `https://api.kerwenmarket.com`
   (можно несколько через запятую — запасные серверы: если первый заблокируют, приложение попробует следующий).
2. **Ключ подписи (очень важно, один раз навсегда).** Без одного и того же ключа пользователи не смогут
   обновлять приложение. На сервере:
   ```bash
   apt-get install -y openjdk-17-jre-headless
   keytool -genkey -v -keystore /root/kerwen-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias kerwen
   base64 -w0 /root/kerwen-release.jks; echo
   ```
   В GitHub → **Secrets** добавьте: `ANDROID_KEYSTORE_BASE64` (длинная строка из последней команды),
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` = `kerwen`, `ANDROID_KEY_PASSWORD`.
   **Сохраните файл `kerwen-release.jks` и пароли в надёжном месте (2 копии).**
3. GitHub → **Actions → CI → Run workflow**. Через ~15 минут в разделе **Artifacts** будет
   `kerwen-market-apk`: внутри `kerwen-market.apk` (для всех телефонов).
4. Раздавайте APK напрямую (Google Play в Туркменистане может быть недоступен).

## Шаг 5. Первые торговцы

Панель владельца → **«Новый торговец»** → название магазина, имя, телефон → **код**.
Торговец устанавливает приложение → регистрируется → «Профиль → Я торговец» → вводит код.
Оплату подписки отмечайте кнопкой **«Принять оплату»** в карточке магазина.

---

## Обслуживание

| Что | Команда (в `/opt/kerwen/deploy`) |
|---|---|
| Логи сервера | `docker compose logs -f api` |
| Перезапуск | `docker compose restart api` |
| Обновить до новой версии | `cd /opt/kerwen && git pull && cd deploy && docker compose up -d --build` |
| Резервная копия сейчас | `./backup.sh` (файлы в `/var/backups/kerwen`) |
| Проверить, что копия восстанавливается | `./restore-test.sh` (раз в месяц) |
| Восстановить из копии (опасно) | `./restore.sh /var/backups/kerwen/db-....dump` |

Раз в неделю копируйте `/var/backups/kerwen` к себе на компьютер.

## Необязательно

**Вход через Google.** console.cloud.google.com → создать проект → OAuth client IDs: «Web» и «Android»
(пакет `com.kerwenmarket.kerwen_market` + SHA-1 вашего ключа: `keytool -list -v -keystore /root/kerwen-release.jks`).
Затем: в `deploy/.env` → `GOOGLE_CLIENT_IDS=<web id>,<android id>` и `docker compose up -d`;
в GitHub Variables → `GOOGLE_SERVER_CLIENT_ID=<web id>` и пересобрать APK.
Если Google недоступен — люди входят по телефону и паролю, это всегда работает.

**Push-уведомления (Firebase).** Нужен проект Firebase и файл `google-services.json` для приложения
+ ключ сервисного аккаунта для сервера (`FCM_SERVICE_ACCOUNT_FILE`). Сервер это уже умеет; в приложение
подключим, когда будет проект Firebase. Сейчас уведомления приходят, пока приложение открыто
(WebSocket), и подгружаются при запуске.
