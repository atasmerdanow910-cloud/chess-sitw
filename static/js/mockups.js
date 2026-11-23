/* Иллюстрации шагов: нарисованные экраны Android.
   Каждый шаг — серия экранов { cap, html }. Если в админке загружены настоящие
   скриншоты шага, вместо рисунков показываются они. */
(function () {
  "use strict";
  const { esc, icon, logo } = window.UI;

  const SB_ICONS =
    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 22h20V2z"/></svg>' +
    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 20.5 1.2 8.4A16 16 0 0 1 12 4.3a16 16 0 0 1 10.8 4.1z"/></svg>' +
    '<svg viewBox="0 0 26 24" style="width:15px"><rect x="1.5" y="6.5" width="20" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<rect x="3.6" y="8.6" width="13" height="6.8" rx="1.4" fill="currentColor"/><rect x="22.6" y="10" width="2" height="4" rx="1" fill="currentColor"/></svg>';
  const sb = () => `<div class="m-sb"><span>12:30</span><span class="ic">${SB_ICONS}</span></div>`;
  const tap = '<i class="tap"></i>';
  const app = (color, name) => `<span class="m-app" style="background:${color}">${icon(name)}</span>`;
  const pyApp = () => `<span class="m-pyapp">${logo()}</span>`;
  const back = (title) => `<div class="m-appbar">${icon("back")}<span>${title}</span></div>`;

  /* Редактор Pydroid (тёмный) — общий фон для нескольких экранов */
  const editorLines = () => {
    const ln = (n, html) => `<div><em>${n}</em>${html}</div>`;
    return `<div class="m-code">
      ${ln(1, '<span class="tk-com"># Мой скрипт</span>')}
      ${ln(2, '<span class="tk-kw">import</span> platform')}
      ${ln(3, "")}
      ${ln(4, 'name = <span class="tk-str">"Мир"</span>')}
      ${ln(5, '<span class="tk-bi">print</span>(<span class="tk-str">f"Привет, {name}!"</span>)')}
      ${ln(6, '<span class="tk-bi">print</span>(platform.<span class="tk-fn">python_version</span>())')}
    </div>`;
  };
  const pdBar = (title, extra) => `<div class="m-pd-bar">${icon("menu")}<span>${esc(title)}</span><span class="sp"></span>${extra || icon("folder") + icon("dots")}</div>`;

  const Mockups = {
    /* 1. Скачивание APK */
    download(c) {
      return [
        { cap: "Нажмите «Скачать» в окне браузера", html: `<div class="m">${sb()}
          <div class="m-url">${icon("lock")}<span>${esc(c.host)}</span></div>
          <div class="m-web">${logo()}<b>${esc(c.title)}</b><small>Pydroid 3 · инструкция · файлы</small>
            <span class="m-ybtn">Скачать Pydroid 3</span></div>
          <div class="m-sheet"><div class="m-sheet-grip"></div>
            <div class="m-title">Скачать файл?</div>
            <div class="m-file"><span class="m-file-ico">${icon("package")}</span>
              <div><b>${esc(c.apkName)}</b><small>${esc(c.apkSize)}</small></div></div>
            <div class="m-actions"><span class="m-tbtn">Отмена</span><span class="m-fbtn">Скачать${tap}</span></div>
          </div></div>` },
        { cap: "Откройте файл из уведомления «Загрузка завершена»", html: `<div class="m m-shade">${sb()}
          <div class="m-tiles"><i>${icon("globe")}</i><i class="on">${icon("smartphone")}</i><i>${icon("lock")}</i><i>${icon("cloud")}</i></div>
          <div class="m-notif">
            <div class="m-notif-head">${app("#4285f4", "globe")}<span>Chrome · сейчас</span></div>
            <b>Загрузка завершена</b>
            <small>${esc(c.apkName)} · ${esc(c.apkSize)}</small>
            <div class="m-actions" style="justify-content:flex-start"><span class="m-tbtn">Открыть${tap}</span></div>
          </div></div>` },
      ];
    },

    /* 2. Разрешение установки */
    unknown() {
      return [
        { cap: "Android предупредит — нажмите «Настройки»", html: `<div class="m">${sb()}
          ${back("Загрузки")}
          <div class="m-dim"><div class="m-dialog">
            <span class="m-folder" style="background:#fdecea;color:#d93025">${icon("shield")}</span>
            <b>Установка заблокирована</b>
            <p>В целях безопасности на телефоне запрещена установка неизвестных приложений из этого источника.</p>
            <div class="m-actions"><span class="m-tbtn">Отмена</span><span class="m-tbtn">Настройки${tap}</span></div>
          </div></div></div>` },
        { cap: "Включите «Разрешить из этого источника» и вернитесь назад", html: `<div class="m">${sb()}
          ${back("Установка неизвестных приложений")}
          <div class="m-list"><div class="m-row">${app("#4285f4", "globe")}
            <div class="grow"><b>Chrome</b><small>Браузер</small></div></div></div>
          <div class="m-list"><div class="m-row"><div class="grow"><b>Разрешить из этого источника</b></div>
            <span class="m-switch">${tap}</span></div></div>
          <div class="m-note">${icon("info")}<span>После включения нажмите «Назад» — появится кнопка «Установить».</span></div>
        </div>` },
      ];
    },

    /* 3. Установка */
    install(c) {
      const list = `${back("Загрузки")}<div class="m-list"><div class="m-row"><span class="m-file-ico">${icon("package")}</span>
        <div class="grow"><b>${esc(c.apkName)}</b><small>${esc(c.apkSize)}</small></div></div></div>`;
      return [
        { cap: "Нажмите «Установить»", html: `<div class="m">${sb()}${list}
          <div class="m-dim"><div class="m-dialog">${pyApp()}<b>Pydroid 3</b>
            <p>Установить это приложение?</p>
            <div class="m-actions"><span class="m-tbtn">Отмена</span><span class="m-tbtn">Установить${tap}</span></div>
          </div></div></div>` },
        { cap: "Готово — нажмите «Открыть»", html: `<div class="m">${sb()}${list}
          <div class="m-dim"><div class="m-dialog">${pyApp()}<b>Pydroid 3</b>
            <p>Приложение установлено.</p>
            <div class="m-actions"><span class="m-tbtn">Готово</span><span class="m-tbtn">Открыть${tap}</span></div>
          </div></div></div>` },
      ];
    },

    /* 4. Запуск приложения */
    open() {
      const ic = (color, name, label) => `<span class="m-ic"><i style="background:${color}">${icon(name)}</i>${label}</span>`;
      return [
        { cap: "Найдите Pydroid 3 среди приложений", html: `<div class="m-home">${sb()}
          <div class="m-clock">12:30</div><div class="m-date">понедельник, 23 ноября</div>
          <div class="m-grid">
            ${ic("#34a853", "image", "Галерея")}${ic("#ea4335", "music", "Музыка")}
            ${ic("#5f6368", "sliders", "Настройки")}${ic("#fbbc04", "folder", "Файлы")}
            ${ic("#1e88e5", "mail", "Почта")}
            <span class="m-ic">${pyApp()}Pydroid 3${tap}</span>
            ${ic("#8e24aa", "store", "Play Маркет")}${ic("#00897b", "zap", "Заметки")}
          </div>
          <div class="m-dock"><i style="background:#34a853">${icon("phone")}</i><i style="background:#1e88e5">${icon("chat")}</i>
            <i style="background:#4285f4">${icon("globe")}</i><i style="background:#455a64">${icon("camera")}</i></div>
        </div>` },
      ];
    },

    /* 5. Доступ к хранилищу — подробно */
    storage() {
      const appHead = `<div class="m-apphead">${pyApp()}<b>Pydroid 3</b><small>Версия приложения</small></div>`;
      return [
        { cap: "Pydroid 3 спросит доступ — нажмите «Разрешить»", html: `<div class="m m-dark">${sb()}
          ${pdBar("Pydroid 3")}${editorLines()}
          <div class="m-dim"><div class="m-dialog"><span class="m-folder">${icon("folder")}</span>
            <b>Разрешить приложению «Pydroid 3» доступ к файлам на устройстве?</b>
            <div class="m-stack" style="margin-top:12px"><span class="m-tbtn hl">Разрешить${tap}</span><span class="m-tbtn">Запретить</span></div>
          </div></div></div>` },
        { cap: "Нет запроса? Настройки → Приложения → Pydroid 3 → «Разрешения»", html: `<div class="m">${sb()}
          ${back("О приложении")}${appHead}
          <div class="m-btnrow"><span>${icon("external")}Открыть</span><span>${icon("x")}Остановить</span></div>
          <div class="m-list">
            <div class="m-row"><div class="grow"><b>Уведомления</b><small>Включены</small></div></div>
            <div class="m-row hl"><div class="grow"><b>Разрешения</b><small>Разрешения не предоставлены</small></div>${tap}</div>
            <div class="m-row"><div class="grow"><b>Память и кеш</b><small>Использовано 210 МБ</small></div></div>
          </div></div>` },
        { cap: "Откройте «Файлы и медиа» в списке «Не разрешено»", html: `<div class="m">${sb()}
          ${back("Разрешения приложения")}${appHead}
          <div class="m-sec">Разрешено</div>
          <div class="m-list"><div class="m-row"><div class="grow"><small>Нет разрешений</small></div></div></div>
          <div class="m-sec">Не разрешено</div>
          <div class="m-list"><div class="m-row hl">${app("#5f6368", "folder")}<div class="grow"><b>Файлы и медиа</b></div>${tap}</div></div>
        </div>` },
        { cap: "Выберите «Разрешить»", html: `<div class="m">${sb()}
          ${back("Файлы и медиаконтент")}${appHead}
          <div class="m-sec">Доступ к файлам и медиаконтенту для этого приложения</div>
          <div class="m-list">
            <div class="m-row hl"><span class="m-radio on"></span><div class="grow"><b>Разрешить</b></div>${tap}</div>
            <div class="m-row"><span class="m-radio"></span><div class="grow"><b>Запретить</b></div></div>
          </div></div>` },
        { cap: "Android 11+: Специальный доступ → «Доступ ко всем файлам» → Вкл.", html: `<div class="m">${sb()}
          ${back("Доступ ко всем файлам")}${appHead}
          <div class="m-list"><div class="m-row hl"><div class="grow"><b>Разрешить доступ для управления всеми файлами</b></div>
            <span class="m-switch">${tap}</span></div></div>
          <div class="m-note">${icon("info")}<span>Приложение сможет читать и изменять файлы на устройстве — это нужно, чтобы открывать .py из «Загрузок».</span></div>
        </div>` },
      ];
    },

    /* 6. Открыть файл */
    file(c) {
      return [
        { cap: "Нажмите значок папки вверху → «Open»", html: `<div class="m m-dark">${sb()}
          ${pdBar("untitled.py", `<span class="m-hl-ico">${icon("folder")}</span>${icon("dots")}`)}${editorLines()}
          <div class="m-pop"><span>New</span><span class="hl">Open${tap}</span><span>Save</span><span>Save as</span><span>Recent</span></div>
        </div>` },
        { cap: "Internal storage → Download → выберите файл", html: `<div class="m m-dark">${sb()}
          <div class="m-pd-bar">${icon("back")}<span>Open</span><span class="sp"></span>${icon("search")}</div>
          <div class="m-path"><span>Internal storage</span>›<span class="cur">Download</span></div>
          <div class="m-frow">${icon("folder")}<div>Telegram<small>Папка</small></div></div>
          <div class="m-frow">${icon("package")}<div>${esc(c.apkName)}<small>${esc(c.apkSize)}</small></div></div>
          <div class="m-frow hl">${logo()}<div>${esc(c.fileName)}<small>Python · только что</small></div>${tap}</div>
          <div class="m-frow">${icon("file")}<div>notes.txt<small>2 КБ</small></div></div>
        </div>` },
      ];
    },

    /* 7. Запуск */
    run(c) {
      return [
        { cap: "Нажмите жёлтую кнопку ▶", html: `<div class="m m-dark">${sb()}
          ${pdBar(c.fileName)}${editorLines()}
          <span class="m-run">${icon("play")}${tap}</span>
        </div>` },
        { cap: "Результат появится в терминале", html: `<div class="m m-dark">${sb()}
          <div class="m-pd-bar">${icon("back")}<span>Terminal</span><span class="sp"></span>${icon("dots")}</div>
          <div class="m-termfull"><span>$ python ${esc(c.fileName)}</span>
Привет, Мир!
3.11.4

<span>[Program finished]</span></div>
        </div>` },
      ];
    },
  };

  window.Mockups = Mockups;
})();
