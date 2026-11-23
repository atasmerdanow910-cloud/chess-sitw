/* Иллюстрации шагов: нарисованные экраны Android.
   Каждый шаг — серия экранов { cap, html }. Если в админке загружены настоящие
   скриншоты шага, вместо рисунков показываются они.
   Тексты берутся из i18n.js — на выбранном языке. */
(function () {
  "use strict";
  const { esc, icon, logo } = window.UI;
  const T = (key) => esc(window.I18N ? window.I18N.t(key) : key);

  const SB_ICONS =
    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M2 22h20V2z"/></svg>' +
    '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 20.5 1.2 8.4A16 16 0 0 1 12 4.3a16 16 0 0 1 10.8 4.1z"/></svg>' +
    '<svg viewBox="0 0 26 24" style="width:15px"><rect x="1.5" y="6.5" width="20" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '<rect x="3.6" y="8.6" width="13" height="6.8" rx="1.4" fill="currentColor"/><rect x="22.6" y="10" width="2" height="4" rx="1" fill="currentColor"/></svg>';
  const sb = () => `<div class="m-sb"><span>12:30</span><span class="ic">${SB_ICONS}</span></div>`;
  const tap = '<i class="tap"></i>';
  const app = (color, name) => `<span class="m-app" style="background:${color}">${icon(name)}</span>`;

  /* Настоящие скриншоты Pydroid 3 лежат в /static/img/pd (720×1538, как экран телефона) */
  const V = (() => {
    try { return new URL(document.currentScript.src).searchParams.get("v") || ""; } catch (e) { return ""; }
  })();
  const IMG = (name) => "/static/img/pd/" + name + ".webp" + (V ? "?v=" + V : "");
  const pyApp = () => `<span class="m-pyapp"><img src="${IMG("icon")}" alt="" decoding="async"></span>`;

  /* Кадр-скриншот: hits — где нажать, [x, y, ширина, высота] в процентах кадра.
     Если нажатий несколько, рамки нумеруются по порядку. */
  const shot = (name, capKey, hits) => {
    const cap = window.I18N.t(capKey);
    const marks = hits.map((h, i) =>
      `<i class="hit" style="left:${h[0]}%;top:${h[1]}%;width:${h[2]}%;height:${h[3]}%">${hits.length > 1 ? `<b>${i + 1}</b>` : ""}</i>`).join("");
    return {
      cap, shot: true,
      html: `<div class="shot"><img src="${IMG(name)}" alt="${esc(cap)}" width="720" height="1538" loading="lazy" decoding="async">${marks}</div>`,
    };
  };
  const CONTINUE = [1.84, 90.73, 96.12, 6.18];
  const back = (title) => `<div class="m-appbar">${icon("back")}<span>${title}</span></div>`;

  /* Редактор Pydroid (тёмный) — общий фон для нескольких экранов */
  const editorLines = () => {
    const ln = (n, html) => `<div><em>${n}</em>${html}</div>`;
    return `<div class="m-code">
      ${ln(1, `<span class="tk-com">${T("m_code_comment")}</span>`)}
      ${ln(2, '<span class="tk-kw">import</span> platform')}
      ${ln(3, "")}
      ${ln(4, `name = <span class="tk-str">"${T("m_code_world")}"</span>`)}
      ${ln(5, `<span class="tk-bi">print</span>(<span class="tk-str">f"${T("m_code_hello")}, {name}!"</span>)`)}
      ${ln(6, '<span class="tk-bi">print</span>(platform.<span class="tk-fn">python_version</span>())')}
    </div>`;
  };
  const pdBar = (title, extra) => `<div class="m-pd-bar">${icon("menu")}<span>${esc(title)}</span><span class="sp"></span>${extra || icon("folder") + icon("dots")}</div>`;

  const Mockups = {
    /* 1. Скачивание APK */
    download(c) {
      return [
        { cap: window.I18N.t("m_dl_cap1"), html: `<div class="m">${sb()}
          <div class="m-url">${icon("lock")}<span>${esc(c.host)}</span></div>
          <div class="m-web">${logo()}<b>${esc(c.title)}</b><small>${T("m_web_sub")}</small>
            <span class="m-ybtn">${T("dl_pydroid")}</span></div>
          <div class="m-sheet"><div class="m-sheet-grip"></div>
            <div class="m-title">${T("m_dl_q")}</div>
            <div class="m-file"><span class="m-file-ico">${icon("package")}</span>
              <div><b>${esc(c.apkName)}</b><small>${esc(c.apkSize)}</small></div></div>
            <div class="m-actions"><span class="m-tbtn">${T("m_cancel")}</span><span class="m-fbtn">${T("download")}${tap}</span></div>
          </div></div>` },
        { cap: window.I18N.t("m_dl_cap2"), html: `<div class="m m-shade">${sb()}
          <div class="m-tiles"><i>${icon("globe")}</i><i class="on">${icon("smartphone")}</i><i>${icon("lock")}</i><i>${icon("cloud")}</i></div>
          <div class="m-notif">
            <div class="m-notif-head">${app("#4285f4", "globe")}<span>${T("m_chrome_now")}</span></div>
            <b>${T("m_dl_done")}</b>
            <small>${esc(c.apkName)} · ${esc(c.apkSize)}</small>
            <div class="m-actions" style="justify-content:flex-start"><span class="m-tbtn">${T("m_open")}${tap}</span></div>
          </div></div>` },
        shot("01-play", "sh_play", [[1.2, 10.09, 71.13, 7.73]]),
      ];
    },

    /* 2. Разрешение установки */
    unknown() {
      return [
        { cap: window.I18N.t("m_un_cap1"), html: `<div class="m">${sb()}
          ${back(T("m_downloads"))}
          <div class="m-dim"><div class="m-dialog">
            <span class="m-folder" style="background:#fdecea;color:#d93025">${icon("shield")}</span>
            <b>${T("m_blocked")}</b>
            <p>${T("m_blocked_p")}</p>
            <div class="m-actions"><span class="m-tbtn">${T("m_cancel")}</span><span class="m-tbtn">${T("m_settings")}${tap}</span></div>
          </div></div></div>` },
        { cap: window.I18N.t("m_un_cap2"), html: `<div class="m">${sb()}
          ${back(T("m_unknown_apps"))}
          <div class="m-list"><div class="m-row">${app("#4285f4", "globe")}
            <div class="grow"><b>Chrome</b><small>${T("m_browser")}</small></div></div></div>
          <div class="m-list"><div class="m-row"><div class="grow"><b>${T("m_allow_src")}</b></div>
            <span class="m-switch">${tap}</span></div></div>
          <div class="m-note">${icon("info")}<span>${T("m_un_note")}</span></div>
        </div>` },
      ];
    },

    /* 3. Установка */
    install(c) {
      const list = `${back(T("m_downloads"))}<div class="m-list"><div class="m-row"><span class="m-file-ico">${icon("package")}</span>
        <div class="grow"><b>${esc(c.apkName)}</b><small>${esc(c.apkSize)}</small></div></div></div>`;
      return [
        { cap: window.I18N.t("m_in_cap1"), html: `<div class="m">${sb()}${list}
          <div class="m-dim"><div class="m-dialog">${pyApp()}<b>Pydroid 3</b>
            <p>${T("m_install_q")}</p>
            <div class="m-actions"><span class="m-tbtn">${T("m_cancel")}</span><span class="m-tbtn">${T("m_install")}${tap}</span></div>
          </div></div></div>` },
        { cap: window.I18N.t("m_in_cap2"), html: `<div class="m">${sb()}${list}
          <div class="m-dim"><div class="m-dialog">${pyApp()}<b>Pydroid 3</b>
            <p>${T("m_installed")}</p>
            <div class="m-actions"><span class="m-tbtn">${T("m_done")}</span><span class="m-tbtn">${T("m_open")}${tap}</span></div>
          </div></div></div>` },
      ];
    },

    /* 4. Запуск приложения */
    open() {
      const ic = (color, name, label) => `<span class="m-ic"><i style="background:${color}">${icon(name)}</i>${label}</span>`;
      return [
        { cap: window.I18N.t("m_op_cap"), html: `<div class="m-home">${sb()}
          <div class="m-clock">12:30</div><div class="m-date">${T("m_date")}</div>
          <div class="m-grid">
            ${ic("#34a853", "image", T("m_gallery"))}${ic("#ea4335", "music", T("m_music"))}
            ${ic("#5f6368", "sliders", T("m_settings"))}${ic("#fbbc04", "folder", T("m_files"))}
            ${ic("#1e88e5", "mail", T("m_mail"))}
            <span class="m-ic">${pyApp()}Pydroid 3${tap}</span>
            ${ic("#8e24aa", "store", T("m_store"))}${ic("#00897b", "zap", T("m_notes"))}
          </div>
          <div class="m-dock"><i style="background:#34a853">${icon("phone")}</i><i style="background:#1e88e5">${icon("chat")}</i>
            <i style="background:#4285f4">${icon("globe")}</i><i style="background:#455a64">${icon("camera")}</i></div>
        </div>` },
        shot("03-welcome", "sh_welcome", [CONTINUE]),
        shot("04-goal", "sh_goal", [[1.84, 43.91, 96.12, 4.82], CONTINUE]),
        shot("05-level", "sh_level", [[1.84, 43.91, 96.12, 4.82], CONTINUE]),
        shot("06-types", "sh_types", [[1.84, 47.55, 96.12, 4.82], CONTINUE]),
        shot("07-prefs", "sh_prefs", [CONTINUE]),
        shot("08-ready", "sh_ready", [CONTINUE]),
        shot("09-ad", "sh_ad", [[88.33, 1.95, 9.44, 4.42]]),
      ];
    },

    /* 5. Доступ к файлам: папка → Open → ALLOW → переключатель */
    storage() {
      return [
        shot("10-folder", "sh_folder", [[65.24, 1.55, 8.74, 4.09]]),
        shot("11-open", "sh_open", [[49.03, 7.0, 49.77, 5.73]]),
        shot("12-allow", "sh_allow", [[38.35, 55.73, 23.3, 5.18]]),
        shot("13-switch", "sh_switch", [[1.2, 18.23, 97.6, 7.14]]),
      ];
    },

    /* 6. Открыть файл: Internal storage → Download → файл */
    file(c) {
      return [
        shot("14-storage", "sh_storage", [[1.2, 8.09, 97.6, 6.55]]),
        { cap: window.I18N.t("m_fi_cap2"), html: `<div class="m m-dark m-pdgray">${sb()}
          <div class="m-pd-bar">${icon("back")}<span>Download</span></div>
          <div class="m-frow">${icon("folder")}<div>Telegram<small>${T("m_folder")}</small></div></div>
          <div class="m-frow">${icon("package")}<div>${esc(c.apkName)}<small>${esc(c.apkSize)}</small></div></div>
          <div class="m-frow hl">${icon("file")}<div>${esc(c.fileName)}<small>${T("m_py_now")}</small></div>${tap}</div>
          <div class="m-frow">${icon("file")}<div>notes.txt<small>${T("m_2kb")}</small></div></div>
        </div>` },
      ];
    },

    /* 7. Запуск */
    run(c) {
      return [
        { cap: window.I18N.t("m_ru_cap1"), html: `<div class="m m-dark">${sb()}
          ${pdBar(c.fileName)}${editorLines()}
          <span class="m-run">${icon("play")}${tap}</span>
        </div>` },
        { cap: window.I18N.t("m_ru_cap2"), html: `<div class="m m-dark">${sb()}
          <div class="m-pd-bar">${icon("back")}<span>Terminal</span><span class="sp"></span>${icon("dots")}</div>
          <div class="m-termfull"><span>$ python ${esc(c.fileName)}</span>
${T("m_code_hello")}, ${T("m_code_world")}!
3.11.4

<span>[Program finished]</span></div>
        </div>` },
      ];
    },
  };

  window.Mockups = Mockups;
})();
