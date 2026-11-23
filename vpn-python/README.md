# VPN Python

Сайт для Android: Pydroid 3, инструкция из 7 шагов с картинками, библиотека .py скриптов,
вход через Google и админка (пароль + 2FA).

Код взят из ветки `ccr-0774bf1d-0dfpmd` (коммит `125f2a31`) и доработан здесь:

- **три языка** — русский, турецкий, туркменский (`static/js/i18n.js`). При первом входе
  посетитель выбирает язык; выбор хранится в куке `sm_lang` на всём домене, поэтому
  маркетплейс и VPN Python помнят один и тот же язык;
- переведены страница, шаги инструкции и нарисованные экраны Android (`mockups.js`);
- админка осталась на русском.

## Установка

Ставится вместе с маркетплейсом одним скриптом `marketplace/deploy/vpn-python.sh`:

```
https://DOMAIN          → маркетплейс
https://DOMAIN/admin    → админка VPN Python
https://market.DOMAIN   → сайт VPN Python
```

Данные (скрипты, APK, фото шагов, пароль) лежат в `/opt/vpn-python/data` и при обновлении сохраняются.

## Разработка

```bash
python3 -m venv venv && . venv/bin/activate
pip install -r requirements.txt
python app.py set-password
python app.py                              # http://localhost:8000
python -m unittest discover -s tests -v    # автотесты
```

Pydroid 3 — стороннее приложение, все права принадлежат его разработчикам.
«Python» и логотип Python — товарные знаки Python Software Foundation.
