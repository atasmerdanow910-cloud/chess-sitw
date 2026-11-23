/* Нарисованные экраны Android для каждого шага инструкции.
   Если в админке загружено настоящее фото шага — показывается фото. */
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

  const Mockups = {
    /* 1. Скачивание APK в браузере */
    download(c) {
      return `<div class="m">${sb()}
        <div class="m-url">${icon("globe")}<span>${esc(c.host)}</span></div>
        <div class="m-web">${logo()}<b>${esc(c.title)}</b><small>Pydroid 3 · инструкция · файлы</small>
          <span class="m-ybtn">Скачать Pydroid 3</span></div>
        <div class="m-sheet"><div class="m-sheet-grip"></div>
          <div class="m-title">Скачать файл?</div>
          <div class="m-file"><span class="m-file-ico">${icon("package")}</span>
            <div><b>${esc(c.apkName)}</b><small>${esc(c.apkSize)}</small></div></div>
          <div class="m-actions"><span class="m-tbtn">Отмена</span><span class="m-fbtn">Скачать${tap}</span></div>
        </div></div>`;
    },

    /* 2. Разрешение установки из неизвестных источников */
    unknown() {
      return `<div class="m">${sb()}
        <div class="m-appbar">${icon("back")}<span>Установка неизвестных приложений</span></div>
        <div class="m-list"><div class="m-row">${app("#4285f4", "globe")}
          <div class="grow"><b>Chrome</b><small>Браузер</small></div></div></div>
        <div class="m-list"><div class="m-row"><div class="grow"><b>Разрешить из этого источника</b></div>
          <span class="m-switch">${tap}</span></div></div>
        <div class="m-note">${icon("alert")}<span>Включите переключатель и вернитесь назад — появится кнопка «Установить».</span></div>
      </div>`;
    },

    /* 3. Установка */
    install(c) {
      return `<div class="m">${sb()}
        <div class="m-appbar">${icon("back")}<span>Загрузки</span></div>
        <div class="m-list"><div class="m-row"><span class="m-file-ico">${icon("package")}</span>
          <div class="grow"><b>${esc(c.apkName)}</b><small>${esc(c.apkSize)}</small></div></div></div>
        <div class="m-dim"><div class="m-dialog">${pyApp()}<b>Pydroid 3</b>
          <p>Установить это приложение?</p>
          <div class="m-actions"><span class="m-tbtn">Отмена</span><span class="m-tbtn">Установить${tap}</span></div>
        </div></div></div>`;
    },

    /* 4. Иконка на рабочем столе */
    open() {
      const ic = (color, name, label) => `<span class="m-ic"><i style="background:${color}">${icon(name)}</i>${label}</span>`;
      return `<div class="m-home">${sb()}
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
      </div>`;
    },

    /* 5. Доступ к хранилищу */
    storage() {
      return `<div class="m m-dark">${sb()}
        <div class="m-pd-bar">${icon("menu")}<span>Pydroid 3</span><span class="sp"></span>${icon("folder")}</div>
        <div class="m-code"><div><em>1</em></div></div>
        <div class="m-dim"><div class="m-dialog"><span class="m-folder">${icon("folder")}</span>
          <b>Разрешить приложению «Pydroid 3» доступ к файлам на устройстве?</b>
          <div class="m-stack" style="margin-top:12px"><span class="m-tbtn hl">Разрешить${tap}</span><span class="m-tbtn">Запретить</span></div>
        </div></div></div>`;
    },

    /* 6. Открыть файл в Pydroid */
    file(c) {
      return `<div class="m m-dark">${sb()}
        <div class="m-pd-bar">${icon("back")}<span>Open</span><span class="sp"></span>${icon("search")}</div>
        <div class="m-path"><span>Internal storage</span>›<span class="cur">Download</span></div>
        <div class="m-frow">${icon("folder")}<div>Telegram<small>Папка</small></div></div>
        <div class="m-frow">${icon("package")}<div>${esc(c.apkName)}<small>${esc(c.apkSize)}</small></div></div>
        <div class="m-frow hl">${logo()}<div>${esc(c.fileName)}<small>Python · только что</small></div>${tap}</div>
        <div class="m-frow">${icon("file")}<div>notes.txt<small>2 КБ</small></div></div>
      </div>`;
    },

    /* 7. Запуск кода */
    run(c) {
      const ln = (n, html) => `<div><em>${n}</em>${html}</div>`;
      return `<div class="m m-dark">${sb()}
        <div class="m-pd-bar">${icon("menu")}<span>${esc(c.fileName)}</span><span class="sp"></span>${icon("folder")}${icon("dots")}</div>
        <div class="m-code">
          ${ln(1, '<span class="tk-com"># Мой скрипт</span>')}
          ${ln(2, '<span class="tk-kw">import</span> platform')}
          ${ln(3, "")}
          ${ln(4, 'name = <span class="tk-str">"Мир"</span>')}
          ${ln(5, '<span class="tk-bi">print</span>(<span class="tk-str">f"Привет, {name}!"</span>)')}
          ${ln(6, '<span class="tk-bi">print</span>(platform.<span class="tk-fn">python_version</span>())')}
        </div>
        <div class="m-term"><span>$ python ${esc(c.fileName)}</span><br>Привет, Мир!<br>3.11.4<br><span>[Program finished]</span></div>
        <span class="m-run">${icon("play")}${tap}</span>
      </div>`;
    },
  };

  window.Mockups = Mockups;
})();
